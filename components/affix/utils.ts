import addEventListener from 'rc-util/lib/Dom/addEventListener';
import type { InternalAffixClass } from '.';

export type BindElement = HTMLElement | Window | null | undefined;

export function getTargetRect(target: BindElement): DOMRect {
  return target !== window
    ? (target as HTMLElement).getBoundingClientRect()
    : ({ top: 0, bottom: window.innerHeight } as DOMRect);
}

export function getFixedTop(placeholderReact: DOMRect, targetRect: DOMRect, offsetTop?: number) {
  if (offsetTop !== undefined && targetRect.top > placeholderReact.top - offsetTop) {
    return offsetTop + targetRect.top;
  }
  return undefined;
}

export function getFixedBottom(
  placeholderReact: DOMRect,
  targetRect: DOMRect,
  offsetBottom?: number,
) {
  if (offsetBottom !== undefined && targetRect.bottom < placeholderReact.bottom + offsetBottom) {
    const targetBottomOffset = window.innerHeight - targetRect.bottom;
    return offsetBottom + targetBottomOffset;
  }
  return undefined;
}

// ======================== Observer ========================
const TRIGGER_EVENTS = [
  'resize',
  'scroll',
  'touchstart',
  'touchmove',
  'touchend',
  'pageshow',
  'load',
];

interface ObserverEntity {
  target: HTMLElement | Window;
  affixList: any[];
  eventHandlers: { [eventName: string]: any };
}

let observerEntities: ObserverEntity[] = [];

export function getObserverEntities() {
  // Only used in test env. Can be removed if refactor.
  return observerEntities;
}

export function addObserveTarget<T extends InternalAffixClass>(
  target: HTMLElement | Window | null,
  affix?: T,
): void {
  if (!target) {
    return;
  }

  let entity = observerEntities.find((item) => item.target === target);

  if (entity) {
    entity.affixList.push(affix);
  } else {
    entity = {
      target,
      affixList: [affix],
      eventHandlers: {},
    };
    observerEntities.push(entity);

    // Add listener
    TRIGGER_EVENTS.forEach((eventName) => {
      entity!.eventHandlers[eventName] = addEventListener(target, eventName, () => {
        entity!.affixList.forEach((targetAffix) => {
          targetAffix.lazyUpdatePosition();
        });
      });
    });
  }
}

export function removeObserveTarget<T extends InternalAffixClass>(affix: T): void {
  const observerEntity = observerEntities.find((oriObserverEntity) => {
    const hasAffix = oriObserverEntity.affixList.some((item) => item === affix);
    if (hasAffix) {
      oriObserverEntity.affixList = oriObserverEntity.affixList.filter((item) => item !== affix);
    }
    return hasAffix;
  });

  if (observerEntity && observerEntity.affixList.length === 0) {
    observerEntities = observerEntities.filter((item) => item !== observerEntity);

    // Remove listener
    TRIGGER_EVENTS.forEach((eventName) => {
      const handler = observerEntity.eventHandlers[eventName];
      if (handler && handler.remove) {
        handler.remove();
      }
    });
  }
}
