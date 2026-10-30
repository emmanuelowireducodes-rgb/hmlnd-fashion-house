
import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Route as StudioRoute } from "@/routes/studio";
import { Route as DashboardRoute } from "@/routes/studio.dashboard";
import { Route as ProductsRoute } from "@/routes/studio.products";
import { Route as CollectionsRoute } from "@/routes/studio.collections";
import { Route as InventoryRoute } from "@/routes/studio.inventory";
import { Route as OrdersRoute } from "@/routes/studio.orders";
import { Route as MediaRoute } from "@/routes/studio.media";

const testRoot = createRootRoute({ component: Outlet });

const testStudio = StudioRoute.update({
  id: "/studio",
  path: "/studio",
  getParentRoute: () => testRoot,
} as never);

const studioRouteTree = testRoot.addChildren([
  testStudio.addChildren([
    DashboardRoute.update({
      id: "/dashboard",
      path: "/dashboard",
      getParentRoute: () => testStudio,
    } as never),
    ProductsRoute.update({
      id: "/products",
      path: "/products",
      getParentRoute: () => testStudio,
    } as never),
    CollectionsRoute.update({
      id: "/collections",
      path: "/collections",
      getParentRoute: () => testStudio,
    } as never),
    InventoryRoute.update({
      id: "/inventory",
      path: "/inventory",
      getParentRoute: () => testStudio,
    } as never),
    MediaRoute.update({
      id: "/media",
      path: "/media",
      getParentRoute: () => testStudio,
    } as never),
    OrdersRoute.update({
      id: "/orders",
      path: "/orders",
      getParentRoute: () => testStudio,
    } as never),
  ]),
]);

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Studio nested navigation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders each child module in the authenticated Studio shell and supports back navigation", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);

        if (path.includes("/api/studio/session"))
          return json({
            user: {
              id: "owner",
              email: "owner@example.test",
              role: "OWNER",
            },
            strongAuth: true,
            pinAvailable: false,
          });

        if (path === "/api/studio/home/draft")
          return json({ id: "draft-2", revision: 2 });

        if (path === "/api/studio/home")
          return json({
            draft: {
              id: "draft-1",
              revision: 1,
              document: {
                schemaVersion: 1,
                designSystem: {
                  colors: {
                    background: "#FFFFFF",
                    text: "#000000",
                    accent: "#E99801",
                  },
                  typography: {
                    headingFont: "Belleza",
                    bodyFont: "Roboto Condensed",
                    size: "standard",
                  },
                  buttonStyle: "square",
                  spacing: "compact",
                  sectionDefaults: {
                    heroOverlay: "standard",
                  },
                },
                sections: [
                  {
                    id: "mainline",
                    type: "hero",
                    title: "Mainline",
                    image: "/images/hero-mainline.jpg",
                    alt: "Original campaign image",
                    visible: true,
                    order: 0,
                  },
                ],
              },
            },
            published: null,
          });

        if (path.includes("/api/studio/media"))
          return json({
            media: [
              {
                id: "media-1",
                filename: "selected-campaign.png",
                mime_type: "image/png",
                byte_count: 100,
                alt_text: "Selected campaign",
                created_at: "2026-10-30T00:00:00Z",
                url: "/api/site/media/media-1",
              },
            ],
          });

        if (path.includes("/api/studio/dashboard"))
          return json({
            products: 0,
            collections: 0,
            orders: 0,
            pendingOrders: 0,
            customers: 0,
            customisationRequests: null,
            recentChanges: [],
          });

        if (path.includes("/api/studio/orders"))
          return json({ orders: [] });

        if (path.includes("/api/studio/inventory"))
          return json([]);

        if (
          path.includes("/api/studio/products") ||
          path.includes("/api/studio/collections")
        )
          return json([]);

        if (init?.method === "PUT")
          return json({ id: "draft-2", revision: 2 });

        return json({});
      },
    );

    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      routeTree: studioRouteTree,
      history: createMemoryHistory({
        initialEntries: ["/studio"],
      }),
      context: {
        queryClient: new QueryClient(),
      },
    });

    render(<RouterProvider router={router} />);

    await screen.findByRole("link", { name: "Dashboard" });

    expect(
      await screen.findByRole("heading", { name: /Visual Builder/ }),
    ).toBeInTheDocument();

    // Open Media Library from the Visual Builder.
    fireEvent.click(
      screen.getByRole("button", { name: /Media library/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Media Library" }),
    ).toBeInTheDocument();

    // Select an image.
    fireEvent.click(
      screen.getByRole("button", { name: "Use image" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Visual Builder.*Unsaved changes/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", { name: "Selected campaign" }),
    ).toHaveAttribute(
      "src",
      "/api/site/media/media-1",
    );

    // Open the Design System.
    fireEvent.click(
      screen.getByRole("button", { name: /Design system/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Design System" }),
    ).toBeInTheDocument();

    // Change the brand accent colour.
    fireEvent.change(screen.getByLabelText("Accent"), {
      target: { value: "#CC5500" },
    });

    // Verify the design preview updates.
    expect(
      document.querySelector(".studio-canvas"),
    ).toHaveStyle({
      "--brand": "#CC5500",
    });

    // Close Design System and save the draft.
    fireEvent.click(
      screen.getByRole("button", { name: "Done" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Save draft" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/studio/home/draft",
        expect.anything(),
      ),
    );

    const draftRequest = fetchMock.mock.calls.find(
      ([url, options]) =>
        url === "/api/studio/home/draft" &&
        options?.method === "PUT",
    );

    // FIX: The API receives design data nested inside "document".
    expect(draftRequest).toBeDefined();

    const savedDraft = JSON.parse(
      String(draftRequest?.[1]?.body),
    );

    // Verify the updated Design System was saved.
    expect(
      savedDraft.document.designSystem.colors.accent,
    ).toBe("#CC5500");

    // Verify the selected media image was saved.
    expect(
      savedDraft.document.sections[0].image,
    ).toBe("/api/site/media/media-1");

    // Verify navigation to all implemented modules.
    for (const module of [
      "Dashboard",
      "Products",
      "Collections",
      "Inventory",
      "Orders",
    ]) {
      fireEvent.click(
        screen.getByRole("link", { name: module }),
      );

      expect(
        await screen.findByRole("heading", {
          name: module,
          level: 1,
        }),
      ).toBeInTheDocument();

      expect(router.state.location.pathname).toBe(
        `/studio/${module.toLowerCase()}`,
      );
    }

    // Verify browser Back navigation.
    router.history.back();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/studio/inventory",
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Inventory",
        level: 1,
      }),
    ).toBeInTheDocument();

    // Verify browser Forward navigation.
    router.history.forward();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/studio/orders",
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Orders",
        level: 1,
      }),
    ).toBeInTheDocument();

    // Return to the Visual Builder.
    fireEvent.click(
      screen.getByRole("link", { name: "Website Builder" }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/studio"),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Visual Builder/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: "Selected campaign",
      }),
    ).toHaveAttribute(
      "src",
      "/api/site/media/media-1",
    );

    // Verify the dedicated Media Library route.
    fireEvent.click(
      screen.getByRole("link", { name: "Media Library" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Media Library",
      }),
    ).toBeInTheDocument();

    expect(router.state.location.pathname).toBe(
      "/studio/media",
    );

    // Navigate back to the Visual Builder.
    fireEvent.click(
      screen.getByRole("link", { name: "Website Builder" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Visual Builder/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: "Selected campaign",
      }),
    ).toHaveAttribute(
      "src",
      "/api/site/media/media-1",
    );
  });
});
