import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_ICON_FALLBACK_LABELS,
  TECHNOLOGY_ICONS,
  resolveTechnologyIcon,
} from "./technology-icons";
import { resumeProfile } from "../test-fixtures/resume-profile";

const asset = (fileName: string) => `https://ohm-mho.space/assets/${fileName}`;

describe("technology icons registry", () => {
  const expectedIconPaths = {
    Codex: asset("openai.svg"),
    "Claude Code": asset("claude-code.svg"),
    MySQL: asset("mysql.svg"),
    PostgreSQL: asset("postgresql.svg"),
    Elasticsearch: asset("elasticsearch.svg"),
    Kubernetes: asset("kubernetes.svg"),
    Kafka: asset("apache-kafka.svg"),
    Redis: asset("redis.svg"),
    Bash: asset("bash.svg"),
    Confluence: asset("confluence.svg"),
    React: asset("react.svg"),
    Go: asset("go.svg"),
    Gin: asset("gin.webp"),
    Oracle: asset("oracle.svg"),
    "Node.js": asset("nodejs.svg"),
    "MongoDB via internal API": asset("mongodb.svg"),
    Scala: asset("scala.svg"),
    "Apache Spark": asset("apache-spark.svg"),
    AWS: asset("aws.svg"),
    "Spring Boot 2.7.x": asset("spring.svg"),
    gRPC: asset("grpc.svg"),
    GraphQL: asset("graphql.svg"),
    "Angular 7.x": asset("angular.svg"),
    "Spring Batch": asset("spring.svg"),
    "IBM Db2": asset("ibm-db2.svg"),
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
        /^https:\/\/ohm-mho\.space\/assets\/[a-z0-9-]+\.(?:svg|webp)$/,
      );
      expect(Number.isInteger(icon.width)).toBe(true);
      expect(Number.isInteger(icon.height)).toBe(true);
      expect(icon.width).toBeGreaterThan(0);
      expect(icon.height).toBeGreaterThan(0);
      expect(["light", "dark"]).toContain(icon.surface);
    }
  });

  it("categorizes every exact résumé label without changing its string data", () => {
    const allTechnologies = resumeProfile.experience.flatMap(
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
