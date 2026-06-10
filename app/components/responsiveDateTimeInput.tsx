'use client';

import CustomDateTimeInput from '@/app/components/customDateTimeInput';
import DateTimeInput from '@/app/components/dateTimeInput';
import { cn } from '@/app/utils/className';
import { isMobile } from '@/app/utils/device';
import type { ReactNode} from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
  autoFocus?: boolean;
}

const ResponsiveDateTimeInput = forwardRef<{ focus: () => void }, ResponsiveDateTimeInputProps>((props, ref) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const customInputRef = useRef<{ focus: () => void }>(null);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (isMobileDevice) (ref as any)?.current?.focus();
      else customInputRef.current?.focus();
    },
  }));

  if (isMobileDevice) {
    const { onEscape, onEnter, className, minimal, ...nativeProps } = props;
    const mobileClassName = minimal ? cn(className, 'w-[170px]') : className;
    return <DateTimeInput {...nativeProps} className={mobileClassName} minimal={minimal} ref={ref as any} />;
  }

  return <CustomDateTimeInput {...props} ref={customInputRef} />;
});

ResponsiveDateTimeInput.displayName = 'ResponsiveDateTimeInput';

export default ResponsiveDateTimeInput;
