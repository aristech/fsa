import type { Role } from 'src/lib/services/role-service';

import useSWR from 'swr';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const isHexObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

const toTitleCase = (text: string) =>
  text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();

export function useRoleLabel(role?: string) {
  const { data, isLoading } = useSWR(
    endpoints.fsa.roles.list,
    fetcher<{ success: boolean; data: Role[] }>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  const roles = data?.data || [];

  // Try to resolve role by slug or id patterns
  const resolveLabel = (): string => {
    if (!role) return 'User';

    // If it looks like "slug_objectId" pattern
    if (role.includes('_')) {
      const [slugCandidate, maybeId] = role.split('_');
      const bySlug = roles.find((r) => r.slug === slugCandidate);
      if (bySlug) return bySlug.name;
      if (maybeId && isHexObjectId(maybeId)) {
        const byId = roles.find((r) => r._id === maybeId);
        if (byId) return byId.name;
      }
      // Fallback: format the slug candidate nicely
      return toTitleCase(slugCandidate);
    }

    // If it's an ObjectId, resolve by id
    if (isHexObjectId(role)) {
      const byId = roles.find((r) => r._id === role);
      if (byId) return byId.name;
    }

    // Try slug match directly
    const bySlug = roles.find((r) => r.slug === role);
    if (bySlug) return bySlug.name;

    // Otherwise format whatever it is
    return toTitleCase(role);
  };

  return { label: resolveLabel(), loading: isLoading } as const;
}
