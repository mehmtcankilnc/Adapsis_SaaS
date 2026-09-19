import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * `catch` bloklarında yakalanan değer TypeScript'te `unknown` tipindedir.
 * Server action'larda tutarlı bir hata mesajı stringi üretmek için kullanılır.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Beklenmeyen bir hata oluştu."
}
