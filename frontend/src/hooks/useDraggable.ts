import { useState, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface SizeBounds {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

interface HeightBounds {
  minHeight: number;
  maxHeight: number;
}

/** Options when the modal supports width+height resizing. */
interface UseDraggableBothOptions {
  initialPosition: Position;
  initialSize: Size;
  resizeMode: "both";
  sizeBounds: SizeBounds;
}

/** Options when the modal supports height-only resizing. */
interface UseDraggableHeightOptions {
  initialPosition: Position;
  initialSize: { height: number };
  resizeMode: "height";
  sizeBounds: HeightBounds;
  /** Fixed width used for boundary-clamping during drag. */
  fixedWidth: number;
}

/** Options when the modal only supports dragging (no resize). */
interface UseDraggableNoneOptions {
  initialPosition: Position;
  resizeMode: "none";
  /** Fixed width used for boundary-clamping during drag. */
  fixedWidth: number;
  /** Fixed height used for boundary-clamping during drag. */
  fixedHeight: number;
}

type UseDraggableOptions =
  | UseDraggableBothOptions
  | UseDraggableHeightOptions
  | UseDraggableNoneOptions;

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

interface UseDraggableBothReturn {
  position: Position;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
  size: Size;
  setSize: React.Dispatch<React.SetStateAction<Size>>;
  isDragging: boolean;
  isResizing: boolean;
  isActive: boolean;
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  onMouseMove: (e: ReactMouseEvent) => void;
  onMouseUp: () => void;
}

interface UseDraggableHeightReturn {
  position: Position;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
  height: number;
  setHeight: React.Dispatch<React.SetStateAction<number>>;
  isDragging: boolean;
  isResizing: boolean;
  isActive: boolean;
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  onMouseMove: (e: ReactMouseEvent) => void;
  onMouseUp: () => void;
}

interface UseDraggableNoneReturn {
  position: Position;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
  isDragging: boolean;
  isResizing: false;
  isActive: boolean;
  onDragStart: (e: ReactMouseEvent) => void;
  onMouseMove: (e: ReactMouseEvent) => void;
  onMouseUp: () => void;
}

type UseDraggableReturn =
  | UseDraggableBothReturn
  | UseDraggableHeightReturn
  | UseDraggableNoneReturn;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraggable(options: UseDraggableBothOptions): UseDraggableBothReturn;
export function useDraggable(options: UseDraggableHeightOptions): UseDraggableHeightReturn;
export function useDraggable(options: UseDraggableNoneOptions): UseDraggableNoneReturn;
export function useDraggable(options: UseDraggableOptions): UseDraggableReturn {
  const { resizeMode, initialPosition } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });

  // --- "both" mode state ---
  const bothInitialSize =
    resizeMode === "both" ? (options as UseDraggableBothOptions).initialSize : { width: 0, height: 0 };
  const [size, setSize] = useState<Size>(bothInitialSize);
  const resizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  // --- "height" mode state ---
  const heightInitialSize =
    resizeMode === "height" ? (options as UseDraggableHeightOptions).initialSize.height : 0;
  const [height, setHeight] = useState<number>(heightInitialSize);
  const heightResizeStartRef = useRef({ height: 0, mouseY: 0 });

  // ── Drag start ──────────────────────────────────────────────────────────
  const onDragStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position.x, position.y],
  );

  // ── Resize start ("both") ──────────────────────────────────────────────
  const onResizeStartBoth = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        width: size.width,
        height: size.height,
        mouseX: e.clientX,
        mouseY: e.clientY,
      };
    },
    [size.width, size.height],
  );

  // ── Resize start ("height") ───────────────────────────────────────────
  const onResizeStartHeight = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      heightResizeStartRef.current = {
        height,
        mouseY: e.clientY,
      };
    },
    [height],
  );

  // ── Mouse move ─────────────────────────────────────────────────────────
  const onMouseMoveBoth = useCallback(
    (e: ReactMouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffsetRef.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffsetRef.current.y)),
        });
      } else if (isResizing) {
        const { sizeBounds } = options as UseDraggableBothOptions;
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        setSize({
          width: Math.max(sizeBounds.minWidth, Math.min(sizeBounds.maxWidth, resizeStartRef.current.width + deltaX)),
          height: Math.max(sizeBounds.minHeight, Math.min(sizeBounds.maxHeight, resizeStartRef.current.height + deltaY)),
        });
      }
    },
    [isDragging, isResizing, options, size.width, size.height],
  );

  const onMouseMoveHeight = useCallback(
    (e: ReactMouseEvent) => {
      if (isDragging) {
        const opts = options as UseDraggableHeightOptions;
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - opts.fixedWidth, e.clientX - dragOffsetRef.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - height, e.clientY - dragOffsetRef.current.y)),
        });
      } else if (isResizing) {
        const { sizeBounds } = options as UseDraggableHeightOptions;
        const deltaY = e.clientY - heightResizeStartRef.current.mouseY;
        setHeight(
          Math.max(sizeBounds.minHeight, Math.min(sizeBounds.maxHeight, heightResizeStartRef.current.height + deltaY)),
        );
      }
    },
    [isDragging, isResizing, height, options],
  );

  const onMouseMoveNone = useCallback(
    (e: ReactMouseEvent) => {
      if (isDragging) {
        const opts = options as UseDraggableNoneOptions;
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - opts.fixedWidth, e.clientX - dragOffsetRef.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - opts.fixedHeight, e.clientY - dragOffsetRef.current.y)),
        });
      }
    },
    [isDragging, options],
  );

  // ── Mouse up ───────────────────────────────────────────────────────────
  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // ── Build return value per mode ────────────────────────────────────────
  const isActive = isDragging || isResizing;

  if (resizeMode === "both") {
    return {
      position,
      setPosition,
      size,
      setSize,
      isDragging,
      isResizing,
      isActive,
      onDragStart,
      onResizeStart: onResizeStartBoth,
      onMouseMove: onMouseMoveBoth,
      onMouseUp,
    };
  }

  if (resizeMode === "height") {
    return {
      position,
      setPosition,
      height,
      setHeight,
      isDragging,
      isResizing,
      isActive,
      onDragStart,
      onResizeStart: onResizeStartHeight,
      onMouseMove: onMouseMoveHeight,
      onMouseUp,
    };
  }

  // resizeMode === "none"
  return {
    position,
    setPosition,
    isDragging,
    isResizing: false as const,
    isActive,
    onDragStart,
    onMouseMove: onMouseMoveNone,
    onMouseUp,
  };
}
