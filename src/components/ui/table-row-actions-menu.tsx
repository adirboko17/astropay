"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface TableRowActionsMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface TableRowActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  isDeleting?: boolean;
  disabled?: boolean;
  extraItems?: TableRowActionsMenuItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MENU_WIDTH = 176;
const MENU_ESTIMATED_HEIGHT = 160;
const VIEWPORT_PADDING = 8;

export function TableRowActionsMenu({
  onEdit,
  onDelete,
  editLabel = "ערוך",
  deleteLabel = "מחק",
  isDeleting = false,
  disabled = false,
  extraItems = [],
  open,
  onOpenChange,
}: TableRowActionsMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const isControlled = open !== undefined;
  const menuOpen = isControlled ? open : internalOpen;

  function setMenuOpen(value: boolean) {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  }

  function close() {
    setMenuOpen(false);
  }

  const menuItems: TableRowActionsMenuItem[] = [
    ...extraItems,
    {
      label: editLabel,
      onClick: onEdit,
      icon: <EditIcon />,
      disabled,
    },
    {
      label: isDeleting ? "מוחק..." : deleteLabel,
      onClick: onDelete,
      icon: <TrashIcon />,
      variant: "danger",
      disabled: disabled || isDeleting,
    },
  ];

  useEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward =
        spaceBelow < MENU_ESTIMATED_HEIGHT &&
        rect.top > MENU_ESTIMATED_HEIGHT;

      const top = openUpward
        ? rect.top - MENU_ESTIMATED_HEIGHT - 4
        : rect.bottom + 4;

      let left = rect.right - MENU_WIDTH;
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
      );

      setMenuPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [menuOpen, menuItems.length]);

  return (
    <div className="relative flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="פעולות"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      >
        <DotsIcon />
      </button>

      {menuOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="סגור תפריט"
                className="fixed inset-0 z-[200]"
                onClick={close}
              />
              <div
                role="menu"
                style={{ top: menuPosition.top, left: menuPosition.left }}
                className="fixed z-[201] min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      close();
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition disabled:opacity-50 ${
                      item.variant === "danger"
                        ? "text-red-600 hover:bg-red-50"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.icon ? (
                      <span className="shrink-0 text-current opacity-70">{item.icon}</span>
                    ) : null}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

export function UserCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
