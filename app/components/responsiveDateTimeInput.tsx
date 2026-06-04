'use client';

import DateTimeInput from '@/app/components/dateTimeInput';
import CustomDateTimeInput from '@/app/components/customDateTimeInput';
import { cn } from '@/app/utils/className';
import { isMobile } from '@/app/utils/device';
import { ForwardedRef, forwardRef, ReactNode, useEffect, useState } from 'react';

interface ResponsiveDateTimeInputProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error: string;
  onError: (error: string) => void;
  onBlur?: (value: string) => void;
  onEscape?: () => void;
  onEnter?: () => void;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
  minimal?: boolean;
  showPresets?: boolean;
}

const ResponsiveDateTimeInput = forwardRef<HTMLInputElement, ResponsiveDateTimeInputProps>((props, ref) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  if (isMobileDevice) {
    const { onEscape, onEnter, className, minimal, ...nativeProps } = props;
    const mobileClassName = minimal ? cn(className, 'w-[170px]') : className;
    return <DateTimeInput {...nativeProps} className={mobileClassName} minimal={minimal} ref={ref} />;
  }

  return <CustomDateTimeInput {...props} ref={ref} />;
});

ResponsiveDateTimeInput.displayName = 'ResponsiveDateTimeInput';

export default ResponsiveDateTimeInput;
