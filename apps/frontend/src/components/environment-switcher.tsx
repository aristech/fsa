'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEnvironmentAccess } from '@/hooks/use-environment-access';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, ChevronDown, Check } from 'lucide-react';

export function EnvironmentSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessField, canAccessOffice, hasBothAccess } = useEnvironmentAccess();
  const [isOpen, setIsOpen] = useState(false);

  const currentEnvironment = pathname.startsWith('/field') ? 'field' : 'office';

  const handleEnvironmentChange = (environment: 'field' | 'office') => {
    if (environment === 'field' && canAccessField) {
      router.push('/field');
    } else if (environment === 'office' && canAccessOffice) {
      router.push('/dashboard');
    }
    setIsOpen(false);
  };

  // Don't show switcher if user only has access to one environment
  if (!hasBothAccess) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentEnvironment === 'field' ? (
            <Smartphone className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {currentEnvironment === 'field' ? 'Field' : 'Office'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleEnvironmentChange('office')}
          disabled={!canAccessOffice}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Office Environment</span>
          </div>
          {currentEnvironment === 'office' && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleEnvironmentChange('field')}
          disabled={!canAccessField}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Field Environment</span>
          </div>
          {currentEnvironment === 'field' && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
