import React from 'react';

/**
 * Renderiza um texto traduzido com marcação mínima:
 * - **trecho** vira <strong> (com a classe strongClassName);
 * - {nome} é trocado pelo nó em `slots` (ícone, <code>, texto condicional).
 * Assim cada idioma posiciona o negrito e os ícones onde a frase pede.
 */
export function Rich({
  text,
  slots = {},
  strongClassName,
}: {
  text: string;
  slots?: Record<string, React.ReactNode>;
  strongClassName?: string;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\{[a-zA-Z]+\})/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className={strongClassName}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        const slot = part.match(/^\{([a-zA-Z]+)\}$/);
        if (slot && slot[1] in slots) return <React.Fragment key={i}>{slots[slot[1]]}</React.Fragment>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
