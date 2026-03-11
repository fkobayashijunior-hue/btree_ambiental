import { useCallback } from "react";

/**
 * Hook que cria um input[type=file] dinamicamente fora do DOM do React.
 * Evita o erro "NotFoundError: insertBefore/removeChild" que ocorre no mobile
 * quando o input está dentro de um Dialog/Modal do React.
 */
export function useFilePicker() {
  const openFilePicker = useCallback(
    (
      options: {
        accept?: string;
        multiple?: boolean;
        capture?: "user" | "environment";
      },
      onFiles: (files: FileList) => void
    ) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = options.accept ?? "image/*";
      if (options.multiple) input.multiple = true;
      if (options.capture) input.capture = options.capture;
      input.style.display = "none";

      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          onFiles(input.files);
        }
        // Remove from body after use
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      // Append to body (outside React tree) to avoid insertBefore errors
      document.body.appendChild(input);
      input.click();

      // Cleanup if user cancels (no change event fires)
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }, 60000);
    },
    []
  );

  return { openFilePicker };
}
