import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merges Tailwind class strings and resolves conflicting utility classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
