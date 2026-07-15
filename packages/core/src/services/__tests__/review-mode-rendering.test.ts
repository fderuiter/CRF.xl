/**
 * @issue #57
 */
import { buildAnnotatedCrfDocument, renderToHtml } from "../acrf-renderer";
import { StudyDesign, DataType, ReviewerComment } from "../../types";

describe("Review Mode Rendering", () => {
  const mockStudy: StudyDesign = {
    metadata: {
      protocolId: "PROT001",
      studyName: "Mock Study",
      version: "1.0",
    },
    forms: {
      FORM01: {
        formName: "Demographics",
        itemGroups: [
          {
            groupOid: "GRP01",
            name: "DM",
            items: [
              {
                itemOid: "AGE",
                name: "Age",
                label: { "en-US": "Age" },
                dataType: DataType.INTEGER,
                mandatory: true,
                annotations: [],
              } as any,
            ],
          },
        ],
      },
    },
  } as any;

  const mockComments: ReviewerComment[] = [
    {
      id: "rev1",
      author: "Dr. Reviewer",
      text: "Please check the age range validation.",
      timestamp: new Date().toISOString(),
      status: "open",
      targetEntityId: "AGE",
    },
  ];

  it("buildAnnotatedCrfDocument includes reviewer comments", () => {
    const doc = buildAnnotatedCrfDocument(mockStudy, [], [], mockComments);
    const item = doc.forms[0].itemGroups[0].items[0];

    const reviewAnno = item.annotations.find((a) => a.label === "Review");
    expect(reviewAnno).toBeDefined();
    expect(reviewAnno?.content).toContain("Dr. Reviewer");
    expect(reviewAnno?.content).toContain("Please check the age range validation.");
  });

  it("renderToHtml includes reviewer comments in output", () => {
    const doc = buildAnnotatedCrfDocument(mockStudy, [], [], mockComments);
    const html = renderToHtml(doc);

    expect(html).toContain("Dr. Reviewer");
    expect(html).toContain("Please check the age range validation.");
    expect(html).toContain("Review");
  });

  it("resolved comments have a different color", () => {
    const resolvedComments: ReviewerComment[] = [
      {
        ...mockComments[0],
        status: "resolved",
        resolvedBy: "Dr. Reviewer",
        resolvedAt: new Date().toISOString(),
      },
    ];

    const doc = buildAnnotatedCrfDocument(mockStudy, [], [], resolvedComments);
    const item = doc.forms[0].itemGroups[0].items[0];
    const reviewAnno = item.annotations.find((a) => a.label === "Review");

    expect(reviewAnno?.color).toBe("var(--colorStatusSuccessBackground3)"); // Success Green
  });
});
