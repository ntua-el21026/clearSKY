// Ensures all grades from 0 to 10 are present even if count = 0
export const normalizeGrades = (data: { grade: number, count: number }[]) => {
  const fullRange = Array.from({ length: 11 }, (_, i) => i);
  const mapped = new Map(data.map(d => [d.grade, d.count]));
  return fullRange.map(grade => ({
    grade,
    count: mapped.get(grade) || 0
  }));
};

// Groups analytic distribution by question and normalizes grade counts
export const groupAndNormalizeByQuestion = (analytic_distribution: { question_label: string, grade: number, count: number }[]) => {
  const grouped: Record<string, { grade: number, count: number }[]> = {};
  analytic_distribution.forEach(({ question_label, grade, count }) => {
    if (!grouped[question_label]) grouped[question_label] = [];
    grouped[question_label].push({ grade, count });
  });

  Object.keys(grouped).forEach(q => {
    grouped[q] = normalizeGrades(grouped[q]);
  });

  return grouped;
};
