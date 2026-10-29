import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

const cart = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/lib/cart", () => ({ useCart: () => ({ count: cart.count, ready: true }) }));

type TestLinkProps = Omit<ComponentProps<"a">, "href"> & {
  to: string;
  params?: Record<string, string>;
  search?: unknown;
};
vi.mock("@tanstack/react-router", async () => {
  const { forwardRef } = await import("react");
  return {
    Link: forwardRef<HTMLAnchorElement, TestLinkProps>(
      ({ to, params, search: _search, ...props }, ref) => {
        const href = to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? key);
        return (
          <a
            {...props}
            href={href}
            ref={ref}
            onClick={(event) => {
              event.preventDefault();
              props.onClick?.(event);
            }}
          />
        );
      },
    ),
    useRouterState: ({
      select,
    }: {
      select: (state: { location: { pathname: string } }) => string;
    }) => select({ location: { pathname: "/" } }),
  };
});

beforeEach(() => {
  cart.count = 0;
});
afterEach(cleanup);

describe("Header navigation", () => {
  it("exposes an accessible bag link with the live item count", () => {
    const { rerender } = render(<Header />);
    expect(screen.getByRole("link", { name: "Shopping bag, 0 items" })).toHaveAttribute(
      "href",
      "/cart",
    );
    cart.count = 2;
    rerender(<Header />);
    expect(screen.getByRole("link", { name: "Shopping bag, 2 items" })).toHaveTextContent("2");
  });

  it("switches previews and closes even when a link targets the current route", async () => {
    render(<Header />);
    const nav = within(screen.getByRole("navigation", { name: "Primary" }));
    fireEvent.click(nav.getByRole("button", { name: "Mainline" }));
    expect(nav.getByRole("button", { name: "Mainline" })).toHaveAttribute("aria-expanded", "true");
    expect(nav.getByRole("link", { name: "Light & Concrete" })).toHaveAttribute(
      "href",
      "/projects/light-and-concrete",
    );
    fireEvent.click(nav.getByRole("button", { name: "Projects" }));
    expect(nav.getByRole("button", { name: "Mainline" })).toHaveAttribute("aria-expanded", "false");
    expect(nav.getByRole("link", { name: "Sunday by the Sea" })).toBeInTheDocument();
    fireEvent.click(nav.getAllByRole("link", { name: "All projects" })[0]!);
    await waitFor(() =>
      expect(nav.getByRole("button", { name: "Projects" })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });

  it("closes the keyboard preview on Escape and restores trigger focus", async () => {
    render(<Header />);
    const trigger = within(screen.getByRole("navigation", { name: "Primary" })).getByRole(
      "button",
      { name: "Customised" },
    );
    trigger.focus();
    fireEvent.click(trigger);
    const link = screen.getAllByRole("link", { name: "Start a customisation enquiry" })[0]!;
    link.focus();
    fireEvent.keyDown(link, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    expect(trigger).toHaveFocus();
  });

  it("provides a tap-controlled dialog and returns focus after Escape", async () => {
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "HMLND navigation" });
    expect(within(dialog).getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
