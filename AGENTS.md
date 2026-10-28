<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Brand colours and fonts are centralised as tokens in src/styles.css; the Futura PT Adobe kit is enabled via BRAND_FONT_KIT_URL in __root.tsx — why: one place to swap palette/fonts.
- The HMLND logo lives in src/components/site/Logo.tsx as a CSS approximation — why: swap in the client's vector there without touching layouts.
