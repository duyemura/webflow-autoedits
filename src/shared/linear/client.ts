import { logger } from "../logger.js";

const LINEAR_API_URL = "https://api.linear.app/graphql";

export class LinearClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LINEAR_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("No Linear API key configured");
    }
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Linear API error (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { data: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new Error(`Linear GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
    }
    return json.data;
  }

  /**
   * Get a single issue by ID.
   */
  async getIssue(issueId: string) {
    const data = await this.graphql<{ issue: LinearIssue }>(
      `query($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          state { id name type }
          team { id key name }
          labels { nodes { id name } }
          priority
          assignee { id name }
          comments { nodes { id body user { id } createdAt } }
          relations { nodes { type relatedIssue { id identifier state { name } } } }
          url
        }
      }`,
      { id: issueId },
    );
    return data.issue;
  }

  /**
   * Update issue status by finding the matching workflow state.
   */
  async updateIssueStatus(issueId: string, teamId: string, statusName: string): Promise<void> {
    // First, find the workflow state ID for this status name
    const statesData = await this.graphql<{ workflowStates: { nodes: { id: string; name: string }[] } }>(
      `query($teamId: ID!) {
        workflowStates(filter: { team: { id: { eq: $teamId } } }) {
          nodes { id name }
        }
      }`,
      { teamId },
    );

    const state = statesData.workflowStates.nodes.find(
      (s) => s.name.toLowerCase() === statusName.toLowerCase(),
    );
    if (!state) {
      throw new Error(`Workflow state "${statusName}" not found for team ${teamId}`);
    }

    await this.graphql(
      `mutation($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          success
        }
      }`,
      { id: issueId, stateId: state.id },
    );

    logger.info({ issueId, status: statusName }, "Issue status updated");
  }

  /**
   * Post a comment on an issue.
   */
  async createComment(issueId: string, body: string): Promise<string> {
    const data = await this.graphql<{ commentCreate: { comment: { id: string } } }>(
      `mutation($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          comment { id }
        }
      }`,
      { issueId, body },
    );
    logger.info({ issueId }, "Comment posted");
    return data.commentCreate.comment.id;
  }

  /**
   * Get comments for an issue.
   */
  async getComments(issueId: string) {
    const data = await this.graphql<{
      issue: { comments: { nodes: { id: string; body: string; user: { id: string }; createdAt: string }[] } };
    }>(
      `query($id: String!) {
        issue(id: $id) {
          comments { nodes { id body user { id } createdAt } }
        }
      }`,
      { id: issueId },
    );
    return data.issue.comments.nodes;
  }

  /**
   * Check if an issue has blocking issues that aren't done.
   */
  async getBlockingIssues(issueId: string): Promise<{ id: string; identifier: string; state: string }[]> {
    const issue = await this.getIssue(issueId);
    if (!issue.relations?.nodes) return [];

    return issue.relations.nodes
      .filter((r) => r.type === "blocks" && r.relatedIssue.state.name !== "Done")
      .map((r) => ({
        id: r.relatedIssue.id,
        identifier: r.relatedIssue.identifier,
        state: r.relatedIssue.state.name,
      }));
  }

  /**
   * Upload an attachment URL to an issue.
   */
  async createAttachment(issueId: string, url: string, title: string): Promise<void> {
    await this.graphql(
      `mutation($issueId: String!, $url: String!, $title: String!) {
        attachmentCreate(input: { issueId: $issueId, url: $url, title: $title }) {
          success
        }
      }`,
      { issueId, url, title },
    );
    logger.info({ issueId, title }, "Attachment created");
  }

  /**
   * Upload a file to Linear and get a URL that can be embedded in comments.
   * Uses Linear's file upload API (request upload URL, then PUT the file).
   */
  async uploadFile(filename: string, contentType: string, fileData: Buffer): Promise<string> {
    // Step 1: Request an upload URL from Linear
    const data = await this.graphql<{
      fileUpload: {
        uploadFile: { uploadUrl: string; assetUrl: string };
      };
    }>(
      `mutation($filename: String!, $contentType: String!, $size: Int!) {
        fileUpload(filename: $filename, contentType: $contentType, size: $size) {
          uploadFile {
            uploadUrl
            assetUrl
          }
        }
      }`,
      { filename, contentType, size: fileData.length },
    );

    const { uploadUrl, assetUrl } = data.fileUpload.uploadFile;

    // Step 2: PUT the file to the upload URL
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
      body: new Uint8Array(fileData),
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload file: ${uploadRes.status}`);
    }

    logger.info({ filename, assetUrl }, "File uploaded to Linear");
    return assetUrl;
  }
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string; type: string };
  team: { id: string; key: string; name: string };
  labels: { nodes: { id: string; name: string }[] };
  priority: number;
  assignee?: { id: string; name: string };
  comments: { nodes: { id: string; body: string; user: { id: string }; createdAt: string }[] };
  relations?: {
    nodes: {
      type: string;
      relatedIssue: { id: string; identifier: string; state: { name: string } };
    }[];
  };
  url: string;
}
