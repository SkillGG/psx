export class URLBuilder {
  #schema?: string = "https";
  #user?: string;
  #password?: string;
  #host?: string;
  #port?: string;
  #path?: string[];
  #queries?: Record<string, string[] | string>;

  get url(): URL {
    if (!this.host())
      throw new TypeError(
        "Tried to create URL without the hostname!\nUse `.host('host')` before getting the url!",
      );

    const url = new URL(`${this.schema()}://${this.host()}/${this.path()}`);

    url.username = this.user();
    url.password = this.password();
    url.port = this.port();
    url.host = this.host();
    url.pathname = this.path();
    for (const [k, v] of Object.entries(this.#queries ?? {})) {
      if (Array.isArray(v)) {
        for (const val of v) url.searchParams.append(k, val);
      } else {
        url.searchParams.set(k, v);
      }
    }

    return url;
  }

  set url(v: URL) {
    this.#schema = v.protocol;
    this.#user = v.username;
    this.#password = v.password;
    this.#host = v.host;
    this.#port = v.port;
    this.#path = v.pathname.split("/");
    this.#queries = Object.fromEntries([...v.searchParams.entries()]);
  }

  schema(): string;
  schema(v: string): URLBuilder;
  schema(this: URLBuilder, v?: string) {
    if (v === undefined) return this.#schema;
    this.#schema = v;
    return this;
  }

  user(): string;
  user(v: string): URLBuilder;
  user(this: URLBuilder, v?: string) {
    if (v === undefined) return this.#user ?? "";
    this.#user = v;
    return this;
  }
  password(): string;
  password(v: string): URLBuilder;
  password(this: URLBuilder, v?: string) {
    if (v === undefined) return this.#password ?? "";
    this.#password = v;
    return this;
  }
  host(): string;
  host(v: string): URLBuilder;
  host(this: URLBuilder, v?: string) {
    if (v === undefined) return this.#host ?? "";
    this.#host = v;
    return this;
  }

  port(): string;
  port(v: string): URLBuilder;
  port(this: URLBuilder, v?: string) {
    if (v === undefined) return this.#port ?? "";
    this.#port = v;
    return this;
  }

  /**
   * Get the path as value
   */
  path(): string;
  /**
   * Set the path to a value
   * @param v Path to set to
   */
  path(v: string): URLBuilder;
  path(n: number, v: string | null, overwrite?: boolean): URLBuilder;
  path(
    this: URLBuilder,
    vOrK?: string | number,
    v?: string | null,
    overwrite = true,
  ) {
    if (vOrK === undefined) return this.#path?.join("/") ?? "";
    const val = typeof vOrK === "string" ? vOrK : v;
    const key = typeof vOrK === "number" ? vOrK : (this.#path?.length ?? 0);
    const nPath = this.#path ?? [];

    console.log(val, key, overwrite);

    if (val) {
      if (v === undefined || !(typeof v === "string"))
        nPath.splice(0, Infinity, ...val.split("/"));
      else nPath.splice(key, overwrite ? 1 : 0, ...val?.split("/"));
    } else nPath.splice(key, 1);

    this.#path = nPath;

    return this;
  }

  query(key: string): string;
  query(key: string, value: string | null): URLBuilder;
  query(this: URLBuilder, key: string, value?: string[] | string | null) {
    if (value === undefined) {
      return this.#queries?.[key] ?? "";
    }

    if (!this.#queries) this.#queries = {};

    if (value === null) {
      if (key in this.#queries) delete this.#queries[key];
    } else this.#queries[key] = value;

    return this;
  }

  constructor(
    options:
      | {
          schema?: string;
          host?: string;
          port?: string;
          user?: string;
          password?: string;
          path?: string;
          queries?: Record<string, string> | [string, string][] | [string][];
        }
      | { url: URL },
  );
  constructor();
  constructor(url: URL);
  constructor(
    options?:
      | {
          schema?: string;
          host?: string;
          port?: string;
          user?: string;
          password?: string;
          path?: string;
          queries?: Record<string, string> | [string, string][] | [string][];
        }
      | { url: URL }
      | URL,
  ) {
    if (!options) {
      return;
    }
    if (options instanceof URL || "url" in options) {
      this.url = options instanceof URL ? options : options.url;
      return;
    }

    const { schema, user, password, host, port, path, queries: qs } = options;
    this.#schema = schema;
    this.#user = user;
    this.#password = password;
    this.#host = host;
    this.#port = port;
    this.#path = path?.split("/");
    if (Array.isArray(qs)) {
      this.#queries = Object.fromEntries(
        qs.map((q) => [q[0] ?? "", q[1] ?? ""]),
      );
    }
  }
}

export const xURL = (host: string) => new URLBuilder().host(host);
