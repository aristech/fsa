// ----------------------------------------------------------------------

export function rowInPage<T>(data: T[], page: number, rowsPerPage: number) {
  return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

// ----------------------------------------------------------------------

export function emptyRows(page: number, rowsPerPage: number, arrayLength: number) {
  return page ? Math.max(0, (1 + page) * rowsPerPage - arrayLength) : 0;
}

// ----------------------------------------------------------------------

/**
 * @example
 * const data = {
 *   calories: 360,
 *   align: 'center',
 *   more: {
 *     protein: 42,
 *   },
 * };
 *
 * const ex1 = getNestedProperty(data, 'calories');
 * // ex1 = 360
 *
 * const ex2 = getNestedProperty(data, 'align');
 * // ex2 = center
 *
 * const ex3 = getNestedProperty(data, 'more.protein');
 * // ex3 = 42
 */
function getNestedProperty<T>(obj: T, key: string): any {
  return key.split('.').reduce((acc: any, part: string) => acc && acc[part], obj);
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  const aValue = getNestedProperty(a, orderBy as string);
  const bValue = getNestedProperty(b, orderBy as string);

  if (bValue < aValue) {
    return -1;
  }

  if (bValue > aValue) {
    return 1;
  }

  return 0;
}

// ----------------------------------------------------------------------

export function getComparator<T extends object, Key extends keyof any>(
  order: 'asc' | 'desc',
  orderBy: Key
): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a as any, b as any, orderBy as any)
    : (a, b) => -descendingComparator(a as any, b as any, orderBy as any);
}
