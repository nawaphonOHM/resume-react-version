import type { ImageAsset } from "../resume-data";
import { assetUrls } from "./asset-urls";

export interface TechnologyIconMetadata extends ImageAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly surface: "light" | "dark";
}

/** Shared artwork metadata for Spring products that use the same brand mark. */
export const SPRING_ICON: TechnologyIconMetadata = {
  src: assetUrls.file("spring.svg"),
  width: 24,
  height: 24,
  surface: "light",
};

/**
 * Validated remote icon registry keyed by exact résumé technology labels.
 * Dimensions and surface metadata keep each brand mark legible and correctly
 * proportioned in chips and zoom previews.
 */
export const TECHNOLOGY_ICONS: Readonly<
  Record<string, TechnologyIconMetadata>
> = {
  Codex: {
    src: assetUrls.file("openai.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "Claude Code": {
    src: assetUrls.file("claude-code.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  MySQL: {
    src: assetUrls.file("mysql.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  PostgreSQL: {
    src: assetUrls.file("postgresql.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Elasticsearch: {
    src: assetUrls.file("elasticsearch.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Kubernetes: {
    src: assetUrls.file("kubernetes.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Kafka: {
    src: assetUrls.file("apache-kafka.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Redis: {
    src: assetUrls.file("redis.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Bash: {
    src: assetUrls.file("bash.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Confluence: {
    src: assetUrls.file("confluence.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  React: {
    src: assetUrls.file("react.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Go: {
    src: assetUrls.file("go.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Gin: {
    src: assetUrls.file("gin.webp"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Oracle: {
    src: assetUrls.file("oracle.svg"),
    width: 64,
    height: 64,
    surface: "light",
  },
  "Node.js": {
    src: assetUrls.file("nodejs.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "MongoDB via internal API": {
    src: assetUrls.file("mongodb.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  Scala: {
    src: assetUrls.file("scala.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "Apache Spark": {
    src: assetUrls.file("apache-spark.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  AWS: {
    src: assetUrls.file("aws.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "Spring Boot 2.7.x": SPRING_ICON,
  gRPC: {
    src: assetUrls.file("grpc.svg"),
    width: 128,
    height: 128,
    surface: "light",
  },
  GraphQL: {
    src: assetUrls.file("graphql.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "Angular 7.x": {
    src: assetUrls.file("angular.svg"),
    width: 24,
    height: 24,
    surface: "light",
  },
  "Spring Batch": SPRING_ICON,
  "IBM Db2": {
    src: assetUrls.file("ibm-db2.svg"),
    width: 32,
    height: 32,
    surface: "light",
  },
};

export const TECHNOLOGY_ICON_FALLBACK_LABELS = [
  "REST APIs",
  "Caffeine",
] as const;

/**
 * Exact-label icon lookup; absence returns undefined to select the generic fallback icon.
 */
export function resolveTechnologyIcon(
  label: string,
): TechnologyIconMetadata | undefined {
  if (Object.prototype.hasOwnProperty.call(TECHNOLOGY_ICONS, label)) {
    return TECHNOLOGY_ICONS[label];
  }
  return undefined;
}
