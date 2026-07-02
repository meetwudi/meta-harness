"use client";

import {
  type ButtonHTMLAttributes,
  cloneElement,
  createContext,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const MenuCloseContext = createContext<() => void>(() => {});

export function Menu({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        "aria-controls": open ? menuId : undefined,
        "aria-expanded": open,
        "aria-haspopup": "menu",
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          trigger.props.onClick?.(event);
          setOpen((current) => !current);
        },
      })
    : trigger;

  return (
    <div className="quartz-menu-root" ref={rootRef}>
      {triggerElement}
      {open ? (
        <MenuCloseContext.Provider value={() => setOpen(false)}>
          <div id={menuId} role="menu" aria-label={label} className="quartz-menu">
            {children}
          </div>
        </MenuCloseContext.Provider>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  destructive = false,
  icon,
  onSelect,
}: {
  children: ReactNode;
  destructive?: boolean;
  icon?: ReactNode;
  onSelect: () => void;
}) {
  const closeMenu = useContext(MenuCloseContext);

  return (
    <button
      type="button"
      role="menuitem"
      className={destructive ? "quartz-menu-item is-destructive" : "quartz-menu-item"}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
        closeMenu();
      }}
    >
      {icon ? <span className="quartz-menu-item-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
