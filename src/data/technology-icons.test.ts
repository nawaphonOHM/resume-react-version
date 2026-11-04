import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_ICON_FALLBACK_LABELS,
  TECHNOLOGY_ICONS,
  imageAssetBaseUrl,
  resolveTechnologyIcon,
} from "./technology-icons";
import { resumeData } from "../resume-data";

describe("technology icons registry", () => {
  const expectedIconPaths = {
    Codex: `${imageAssetBaseUrl}/technology-icons/openai.svg`,
    "Claude Code": `${imageAssetBaseUrl}/technology-icons/claude-code.svg`,
    MySQL: `${imageAssetBaseUrl}/technology-icons/mysql.svg`,
    PostgreSQL: `${imageAssetBaseUrl}/technology-icons/postgresql.svg`,
    Elasticsearch: `${imageAssetBaseUrl}/technology-icons/elasticsearch.svg`,
    Kubernetes: `${imageAssetBaseUrl}/technology-icons/kubernetes.svg`,
    Kafka: `${imageAssetBaseUrl}/technology-icons/apache-kafka.svg`,
    Redis: `${imageAssetBaseUrl}/technology-icons/redis.svg`,
    Bash: `${imageAssetBaseUrl}/technology-icons/bash.svg`,
    Confluence: `${imageAssetBaseUrl}/technology-icons/confluence.svg`,
    React: `${imageAssetBaseUrl}/technology-icons/react.svg`,
    Go: `${imageAssetBaseUrl}/technology-icons/go.svg`,
    Gin: `${imageAssetBaseUrl}/technology-icons/gin.webp`,
    Oracle: `${imageAssetBaseUrl}/technology-icons/oracle.svg`,
    "Node.js": `${imageAssetBaseUrl}/technology-icons/nodejs.svg`,
    "MongoDB via internal API": `${imageAssetBaseUrl}/technology-icons/mongodb.svg`,
    Scala: `${imageAssetBaseUrl}/technology-icons/scala.svg`,
    "Apache Spark": `${imageAssetBaseUrl}/technology-icons/apache-spark.svg`,
    AWS: `${imageAssetBaseUrl}/technology-icons/aws.svg`,
    "Spring Boot 2.7.x": `${imageAssetBaseUrl}/technology-icons/spring.svg`,
    gRPC: `${imageAssetBaseUrl}/technology-icons/grpc.svg`,
    GraphQL: `${imageAssetBaseUrl}/technology-icons/graphql.svg`,
    "Angular 7.x": `${imageAssetBaseUrl}/technology-icons/angular.svg`,
    "Spring Batch": `${imageAssetBaseUrl}/technology-icons/spring.svg`,
    "IBM Db2": `${imageAssetBaseUrl}/technology-icons/ibm-db2.svg`,
  } as const;

  it("maps every branded résumé technology to validated remote metadata", () => {
    expect(
      Object.fromEntries(
        Object.entries(TECHNOLOGY_ICONS).map(([label, icon]) => [
          label,
          icon.src,
        ]),
      ),
    ).toEqual(expectedIconPaths);

    for (const icon of Object.values(TECHNOLOGY_ICONS)) {
      expect(icon.src).toMatch(
        /^https:\/\/resume-images\.ohm-mho\.space\/technology-icons\/[a-z0-9-]+\.(?:svg|webp)$/,
      );
      expect(Number.isInteger(icon.width)).toBe(true);
      expect(Number.isInteger(icon.height)).toBe(true);
      expect(icon.width).toBeGreaterThan(0);
      expect(icon.height).toBeGreaterThan(0);
      expect(["light", "dark"]).toContain(icon.surface);
    }
  });

  it("categorizes every exact résumé label without changing its string data", () => {
    const allTechnologies = resumeData.experience.flatMap(
      ({ technologies }) => technologies,
    );
    const uniqueTechnologies = [...new Set(allTechnologies)];

    expect(
      allTechnologies.every((technology) => typeof technology === "string"),
    ).toBe(true);
    expect(uniqueTechnologies).toHaveLength(27);
    expect(
      uniqueTechnologies.filter(
        (technology) =>
          resolveTechnologyIcon(technology) === undefined &&
          !TECHNOLOGY_ICON_FALLBACK_LABELS.includes(
            technology as (typeof TECHNOLOGY_ICON_FALLBACK_LABELS)[number],
          ),
      ),
    ).toEqual([]);
  });

  it("uses intentional fallbacks for labels without suitable brand marks", () => {
    expect(TECHNOLOGY_ICON_FALLBACK_LABELS).toEqual(["REST APIs", "Caffeine"]);
    expect(resolveTechnologyIcon("REST APIs")).toBeUndefined();
    expect(resolveTechnologyIcon("Caffeine")).toBeUndefined();
    expect(resolveTechnologyIcon("Unknown technology")).toBeUndefined();
    expect(resolveTechnologyIcon("toString")).toBeUndefined();
  });

  it("reuses one Spring icon definition for related labels", () => {
    expect(resolveTechnologyIcon("Spring Boot 2.7.x")).toBe(
      resolveTechnologyIcon("Spring Batch"),
    );
  });
});
