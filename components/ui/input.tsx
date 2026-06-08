import { cn } from '@/lib/utils';
import * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';

function Input({
  className,
  ...props
}: TextInputProps & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'border-input bg-background text-foreground h-11 rounded-md border px-3 text-base',
        props.editable === false && 'opacity-50',
        className
      )}
      placeholderTextColor="rgb(115 115 115)"
      {...props}
    />
  );
}

export { Input };
