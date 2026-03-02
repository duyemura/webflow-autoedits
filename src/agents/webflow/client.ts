import { logger } from "../../shared/logger.js";

const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

/**
 * Webflow REST API v2 client.
 */
export class WebflowClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.WEBFLOW_API_TOKEN || "";
    if (!this.token) {
      logger.warn("No Webflow API token configured");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${WEBFLOW_API_BASE}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webflow API error (${response.status}): ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  // --- Sites ---

  async listSites() {
    return this.request<{ sites: WebflowSite[] }>("GET", "/sites");
  }

  async getSite(siteId: string) {
    return this.request<WebflowSite>("GET", `/sites/${siteId}`);
  }

  async publishSite(siteId: string, domains?: string[]) {
    return this.request("POST", `/sites/${siteId}/publish`, {
      publishToWebflowSubdomain: true,
      ...(domains ? { customDomains: domains } : {}),
    });
  }

  // --- Collections ---

  async listCollections(siteId: string) {
    return this.request<{ collections: WebflowCollection[] }>(
      "GET",
      `/sites/${siteId}/collections`,
    );
  }

  async getCollection(collectionId: string) {
    return this.request<WebflowCollection>(
      "GET",
      `/collections/${collectionId}`,
    );
  }

  // --- Collection Items ---

  async listItems(collectionId: string, limit = 100, offset = 0) {
    return this.request<{ items: WebflowItem[]; pagination: { total: number } }>(
      "GET",
      `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`,
    );
  }

  async getItem(collectionId: string, itemId: string) {
    return this.request<WebflowItem>(
      "GET",
      `/collections/${collectionId}/items/${itemId}`,
    );
  }

  async createItem(collectionId: string, fields: Record<string, unknown>, isDraft = false) {
    return this.request<WebflowItem>(
      "POST",
      `/collections/${collectionId}/items${isDraft ? "" : "/live"}`,
      { fieldData: fields, isDraft },
    );
  }

  async updateItem(
    collectionId: string,
    itemId: string,
    fields: Record<string, unknown>,
    isLive = false,
  ) {
    const path = isLive
      ? `/collections/${collectionId}/items/${itemId}/live`
      : `/collections/${collectionId}/items/${itemId}`;
    return this.request<WebflowItem>("PATCH", path, { fieldData: fields });
  }

  async deleteItem(collectionId: string, itemId: string) {
    return this.request("DELETE", `/collections/${collectionId}/items/${itemId}`);
  }

  // --- Pages ---

  async listPages(siteId: string) {
    return this.request<{ pages: WebflowPage[] }>(
      "GET",
      `/sites/${siteId}/pages`,
    );
  }

  async getPageContent(pageId: string) {
    return this.request<WebflowPageDOM>(
      "GET",
      `/pages/${pageId}/dom`,
    );
  }

  async updatePageContent(pageId: string, nodes: WebflowDOMNode[]) {
    return this.request(
      "PUT",
      `/pages/${pageId}/dom`,
      { nodes },
    );
  }
}

// --- Webflow API Types ---

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  previewUrl: string;
  createdOn: string;
  lastPublished: string;
}

export interface WebflowCollection {
  id: string;
  displayName: string;
  singularName: string;
  slug: string;
  fields: WebflowField[];
}

export interface WebflowField {
  id: string;
  slug: string;
  displayName: string;
  type: string;
  isRequired: boolean;
}

export interface WebflowItem {
  id: string;
  fieldData: Record<string, unknown>;
  isDraft: boolean;
  isArchived: boolean;
  createdOn: string;
  lastUpdated: string;
}

export interface WebflowPage {
  id: string;
  title: string;
  slug: string;
  parentId?: string;
  createdOn: string;
  lastUpdated: string;
}

export interface WebflowPageDOM {
  pageId: string;
  nodes: WebflowDOMNode[];
}

export interface WebflowDOMNode {
  nodeId: string;
  type: string;
  text?: { text: string };
  attributes?: Record<string, string>;
  children?: string[];
}
