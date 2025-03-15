'use client';

import { IconMail, IconPhone } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import { EmployeeWithStatus } from '../../types/types';
import { formatDate } from '../../utils/dateUtils';

type EmployeeDetailsProps = {
  employee: EmployeeWithStatus;
  onClose: () => void;
};

export default function EmployeeDetails({ employee }: EmployeeDetailsProps) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-md font-semibold mb-2">
          {employee.firstName} {employee.familyName}
        </h3>
        <div className="text-sm text-foreground/70">
          Statut:{' '}
          <span
            className={clsx(
              'font-bold',
              {
                pending: 'text-yellow-500',
                accepted: 'text-green-500',
                rejected: 'text-red-500',
              }[employee.status],
            )}
          >
            {employee.status === 'pending' ? 'En attente' : employee.status === 'accepted' ? 'Accepté' : 'Rejeté'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-foreground/70 mb-1">Contact</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IconMail size={25} className="text-foreground/70" />
              <a href={`mailto:${employee.email}`} className="text-foreground hover:underline truncate">
                {employee.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <IconPhone size={25} className="text-foreground/70" />
              <a href={`tel:${employee.tel}`} className="text-foreground hover:underline truncate">
                {employee.tel}
              </a>
            </div>
          </div>
        </div>
      </div>

      {employee.message && employee.status === 'pending' && (
        <div>
          <h4 className="text-sm font-medium text-foreground/70 mb-1">Message</h4>
          <div className="bg-secondary/10 rounded-md text-foreground">{employee.message}</div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-foreground/70 mb-1">Date d&apos;inscription</h4>
        <div className="text-foreground text-sm">{formatDate(new Date(employee.createdAt))}</div>
      </div>
    </div>
  );
}
