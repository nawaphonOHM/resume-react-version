import type { ImageAsset } from "../resume-data";

export interface TechnologyIconMetadata extends ImageAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly surface: "light" | "dark";
}

export const imageAssetBaseUrl = "https://resume-images.ohm-mho.space";

/** Shared artwork metadata for Spring products that use the same brand mark. */
export const SPRING_ICON: TechnologyIconMetadata = {
  src: `${imageAssetBaseUrl}/technology-icons/spring.svg`,
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
    src: `${imageAssetBaseUrl}/technology-icons/openai.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "Claude Code": {
    src: `${imageAssetBaseUrl}/technology-icons/claude-code.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  MySQL: {
    src: `${imageAssetBaseUrl}/technology-icons/mysql.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  PostgreSQL: {
    src: `${imageAssetBaseUrl}/technology-icons/postgresql.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Elasticsearch: {
    src: `${imageAssetBaseUrl}/technology-icons/elasticsearch.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Kubernetes: {
    src: `${imageAssetBaseUrl}/technology-icons/kubernetes.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Kafka: {
    src: `${imageAssetBaseUrl}/technology-icons/apache-kafka.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Redis: {
    src: `${imageAssetBaseUrl}/technology-icons/redis.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Bash: {
    src: `${imageAssetBaseUrl}/technology-icons/bash.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Confluence: {
    src: `${imageAssetBaseUrl}/technology-icons/confluence.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  React: {
    src: `${imageAssetBaseUrl}/technology-icons/react.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Go: {
    src: `${imageAssetBaseUrl}/technology-icons/go.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Gin: {
    src: `${imageAssetBaseUrl}/technology-icons/gin.webp`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Oracle: {
    src: `${imageAssetBaseUrl}/technology-icons/oracle.svg`,
    width: 64,
    height: 64,
    surface: "light",
  },
  "Node.js": {
    src: `${imageAssetBaseUrl}/technology-icons/nodejs.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "MongoDB via internal API": {
    src: `${imageAssetBaseUrl}/technology-icons/mongodb.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  Scala: {
    src: `${imageAssetBaseUrl}/technology-icons/scala.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "Apache Spark": {
    src: `${imageAssetBaseUrl}/technology-icons/apache-spark.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  AWS: {
    src: `${imageAssetBaseUrl}/technology-icons/aws.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "Spring Boot 2.7.x": SPRING_ICON,
  gRPC: {
    src: `${imageAssetBaseUrl}/technology-icons/grpc.svg`,
    width: 128,
    height: 128,
    surface: "light",
  },
  GraphQL: {
    src: `${imageAssetBaseUrl}/technology-icons/graphql.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "Angular 7.x": {
    src: `${imageAssetBaseUrl}/technology-icons/angular.svg`,
    width: 24,
    height: 24,
    surface: "light",
  },
  "Spring Batch": SPRING_ICON,
  "IBM Db2": {
    src: `${imageAssetBaseUrl}/technology-icons/ibm-db2.svg`,
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
