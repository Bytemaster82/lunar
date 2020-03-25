/* eslint-disable no-console, import/no-extraneous-dependencies, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import React from 'react';
import Enzyme, { shallow, mount } from 'enzyme';
import { DirectionContext, ThemeContext } from 'aesthetic-react';

export interface WrappedComponent<P = {}> extends React.ComponentClass<P> {
  displayName: string;
  WrappedComponent: React.ComponentType<any>;
}

type WrappingProps = {
  dir?: 'ltr' | 'rtl';
  themeName?: string;
};

export function WrappingComponent({
  children,
  dir,
  themeName,
}: { children: React.ReactNode } & WrappingProps) {
  return (
    <DirectionContext.Provider value={dir || 'ltr'}>
      <ThemeContext.Provider value={themeName || 'light'}>{children}</ThemeContext.Provider>
    </DirectionContext.Provider>
  );
}

export function mountWithStyles<C extends React.Component, P = C['props'], S = C['state']>(
  element: React.ReactElement<P>,
  props: WrappingProps = {},
): Enzyme.ReactWrapper<P, S, C> {
  return mount(element, {
    wrappingComponent: WrappingComponent,
    wrappingComponentProps: props,
  });
}

export function mountUseStyles<C extends React.Component, P = C['props'], S = C['state']>(
  element: React.ReactElement<P>,
  props: WrappingProps = {},
): Enzyme.ReactWrapper<P, S, C> {
  return mount(element, {
    wrappingComponent: WrappingComponent,
    wrappingComponentProps: props,
  });
}

export function shallowWithStyles<C extends React.Component, P = C['props'], S = C['state']>(
  element: React.ReactElement<P>,
  self: boolean = false,
  props: WrappingProps = {},
): Enzyme.ShallowWrapper<P, S, C> {
  const wrapper = shallow(element, {
    wrappingComponent: WrappingComponent,
    wrappingComponentProps: props,
  });

  return self ? wrapper : (wrapper.dive() as any);
}

export function wrapEnv(env: string, callback: () => unknown): () => unknown {
  return () => {
    const oldEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = env;

    const response = callback();

    process.env.NODE_ENV = oldEnv;

    return response;
  };
}

export function wrapGlobal(
  property: keyof NodeJS.Global,
  callback: (spy: jest.Mock) => unknown,
): () => unknown {
  return () => {
    const old = global[property];

    (global as any)[property] = jest.fn();

    const response = callback(global[property]);

    (global as any)[property] = old;

    return response;
  };
}

export function wrapConsole(
  property: keyof Console,
  callback: (spy: jest.Mock) => unknown,
): () => unknown {
  return () => {
    const old = console[property];

    console[property] = jest.fn();

    const response = callback(console[property]);

    console[property] = old;

    return response;
  };
}

export function getWrapperName<P, S>(wrapper: Enzyme.ShallowWrapper<P, S>): string {
  let name = wrapper.type();

  if (typeof name === 'function') {
    ({ name } = name);
  }

  if (!name || typeof name !== 'string') {
    return '_unknown_';
  }

  return name;
}

export function unwrapHOCs<P, S>(
  wrapper: Enzyme.ShallowWrapper<P, S>,
  target: string,
  context: unknown = {},
  options: { exitOnContext?: boolean; render?: boolean } = {},
): Enzyme.ShallowWrapper<P, S> {
  let result = wrapper;

  // Unwrap all wrapping and annoying HOCs
  while (getWrapperName(result) !== target) {
    const type = result.type();

    if (typeof type === 'string') {
      result = result.children();
    } else if (
      typeof type === 'object' ||
      (typeof type === 'function' && type.name === 'TempConsumer') ||
      (typeof type === 'function' && type.name === 'TempProvider')
    ) {
      const child = result.prop('children');

      if (typeof child === 'function') {
        result = new Enzyme.ShallowWrapper((child as any)(context), result, { context });

        if (options.exitOnContext) {
          return result.shallow({ context });
        }
      } else {
        result = result.shallow({ context });
      }
    } else {
      result = result.shallow({ context });
    }
  }

  // Unwrap one more time to drill into the rendered HTML (children) of the target
  if (options.render) {
    result = result.shallow({ context });
  }

  return result;
}

export function mockNotification() {
  const oldNotification = window.Notification;
  const mock: any = jest.fn(() => {
    let cb: any = null;
    const api = {
      close: jest.fn(),
      onclick: jest.fn(),
      addEventListener: (type: string, callback: unknown) => {
        cb = callback;
      },
      dispatchEvent: (event: Event) => {
        if (cb) {
          cb(event);
        }
      },
    };

    mock.lastInstance = api;

    return api;
  });

  mock.permission = 'default';
  mock.requestPermission = jest.fn().mockResolvedValue('granted');

  window.Notification = mock;

  return () => {
    window.Notification = oldNotification;
  };
}

export function mockResizeObserver() {
  const oldObserver = window.ResizeObserver;

  window.ResizeObserver = jest.fn(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
  })) as any;

  return () => {
    window.ResizeObserver = oldObserver;
  };
}
