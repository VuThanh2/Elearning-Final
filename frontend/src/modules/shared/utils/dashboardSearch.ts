import { HierarchicalReportNode, Section } from '../types';

const normalizeValue = (value: string | number | null | undefined) =>
  String(value ?? '')
    .toLowerCase()
    .trim();

export const normalizeSearchQuery = (value?: string | null) => normalizeValue(value);

export const matchesSearchQuery = (
  query: string,
  ...values: Array<string | number | null | undefined>
) => {
  if (!query) return true;
  return values.some((value) => normalizeValue(value).includes(query));
};

export const filterSectionsByQuery = (sections: Section[], query: string) => {
  if (!query) return sections;

  return sections.filter((section) =>
    matchesSearchQuery(
      query,
      section.sectionName,
      section.sectionCode,
      section.courseName,
      section.courseCode,
      section.facultyName,
      section.facultyCode,
      section.term,
      section.academicYear
    )
  );
};

const averageMetric = (values: Array<number | undefined>) => {
  const numericValues = values.filter((value): value is number => typeof value === 'number');
  if (numericValues.length === 0) return 0;

  return (
    Math.round(
      (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length) * 100
    ) / 100
  );
};

export const filterHierarchyByQuery = (
  node: HierarchicalReportNode,
  query: string
): HierarchicalReportNode | null => {
  if (!query) return node;

  const selfMatches = matchesSearchQuery(query, node.name, node.level);

  if (selfMatches) {
    return node;
  }

  const filteredChildren = (node.children || [])
    .map((child) => filterHierarchyByQuery(child, query))
    .filter((child): child is HierarchicalReportNode => child !== null);

  if (filteredChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    totalQuizzes: filteredChildren.reduce(
      (sum, child) => sum + (child.totalQuizzes || 0),
      0
    ),
    averageScore: averageMetric(filteredChildren.map((child) => child.averageScore)),
    completionRate: averageMetric(filteredChildren.map((child) => child.completionRate)),
    children: filteredChildren,
  };
};
