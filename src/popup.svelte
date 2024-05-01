<script lang="ts">
  import Card from "~popup/Card.svelte";
  import Header from "~popup/Header/Header.svelte";
</script>

<Header />

<Card></Card>

<style lang="scss">
  @mixin light-theme {
    --color-text: #1b1b1b;
    --color-text-disabled: #bcc0c8;
    --color-bg: #ffffff;
    --action-bg-color: #7061ed;

    --card-bg: #ffffff;
    --card-border: rgba(188, 192, 200, 0.5);

    --theme-switcher-bg: #f5f6fc;
    --theme-switcher-button-bg: var(--action-bg-color);
    --theme-switcher-button-color-active: #ffffff;
    --theme-switcher-button-color-inactive: #798191;

    --button-shortcut-color: #1b1b1b;
    --button-shortcut-bg: #ffffff;
    --button-shortcut-border: rgba(188, 192, 200, 0.5);
    --button-shortcut-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.09);

    --button-shortcut-active-color: #ffffff;
    --button-shortcut-active-bg: var(--action-bg-color);
    --button-shortcut-active-border-color: var(--button-shortcut-active-bg);

    --button-shortcut-error-color: #ffffff;
    --button-shortcut-error-bg: #ff4d4f;
    --button-shortcut-error-border-color: var(---button-shortcut-error-bg);

    --button-reset-color: #1b1b1b;
    --button-reset-bg: #ffffff;
    --button-reset-border-color: rgba(188, 192, 200, 0.5);

    --button-cancel-color: #ffffff;
    --button-cancel-bg: #1b1b1b;
    --button-cancel-border-color: var(--button-cancel-bg);

    --button-disabled-color: #bcc0c8;
    --button-disabled-icon-color: #BCC0C8;
    --button-disabled-bg: #f5f6fc;
    --button-disabled-border-color: rgba(188, 192, 200, 0.5);

    --switch-thumb-bg: var(--action-bg-color);
    --switch-thumb-shadow: 0px 4px 4px 0px rgba(112, 97, 237, 0.25);
    --switch-track-bg: #F5F6FC;
    --switch-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --switch-disabled-thumb-bg: #BCC0C8;
    --switch-disabled-thumb-shadow: 0px 4px 4px 0px rgba(188, 192, 200, 0.25);
    --switch-disabled-track-bg: #F5F6FC;
    --switch-disabled-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --textbox-color: #1b1b1b;
    --textbox-bg: #ffffff;
    --textbox-border: rgba(188, 192, 200, 0.5);
    --textbox-suffix-color: var(--action-bg-color);

    --textbox-color-disabled: var(--button-disabled-color);
    --textbox-bg-disabled: var(--button-disabled-bg);

    --checkbox-bg: var(--action-bg-color);
    --checkbox-bg-disabled: #bcc0c8;
  }

  @mixin dark-theme {
    --color-text: #ffffff;
    --color-text-disabled: #bcc0c8;
    --color-bg: #1b1b1b;
    --action-bg-color: #7061ed;

    --card-bg: #242424;
    --card-border: #242424;

    --theme-switcher-bg: var(--card-bg);
    --theme-switcher-button-bg: var(--action-bg-color);
    --theme-switcher-button-color-active: #1b1b1b;
    --theme-switcher-button-color-inactive: #798191;

    --button-shortcut-color: #ffffff;
    --button-shortcut-bg: #1b1b1b;
    --button-shortcut-border: #35373A;
    --button-shortcut-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.09);

    --button-shortcut-active-color: #ffffff;
    --button-shortcut-active-bg: var(--action-bg-color);
    --button-shortcut-active-border-color: var(--button-shortcut-active-bg);

    --button-shortcut-error-color: #ffffff;
    --button-shortcut-error-bg: #ff4d4f;
    --button-shortcut-error-border-color: currentColor;

    --button-reset-color: #ffffff;
    --button-reset-bg: #1b1b1b;
    --button-reset-border-color: #35373A;

    --button-cancel-color: var(--button-reset-color);
    --button-cancel-bg: var(--button-reset-bg);
    --button-cancel-border-color: var(--button-reset-border-color);

    --button-disabled-color: rgba(188, 192, 200, 0.5);
    --button-disabled-icon-color: rgba(255, 255, 255, 0.5);
    --button-disabled-bg: rgba(27, 27, 27, 0.5);
    --button-disabled-border-color: rgba(188, 192, 200, 0.5);

    --switch-thumb-bg: var(--action-bg-color);
    --switch-thumb-shadow: #7061ed;
    --switch-track-bg: #1b1b1b;
    --switch-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --switch-disabled-thumb-bg: #35373A;
    --switch-disabled-thumb-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;
    --switch-disabled-track-bg: #1B1B1B;
    --switch-disabled-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --textbox-color: #ffffff;
    --textbox-bg: #1b1b1b;
    --textbox-border: #35373A;
    --textbox-suffix-color: var(--action-bg-color);

    --textbox-color-disabled: var(--button-disabled-color);
    --textbox-bg-disabled: var(--button-disabled-bg);

    --checkbox-bg: var(--action-bg-color);
    --checkbox-bg-disabled: #707276;
  }

  :global(body[data-theme="light"]) {
    @include light-theme;
  }

  :global(body[data-theme="dark"]) {
    @include dark-theme;
  }

  :global(body) {
    color: var(--color-text);
    background-color: var(--color-bg);
    width: 752px;
    margin: 0;
    font-family: Inter, sans-serif;
    padding: 16px 24px 6px;
    font-size: max(16px, 1rem);
    user-select: none;
    transition:
      color 0.02s ease-in-out,
      background-color 0.4s ease-in-out;
  }

  :global(::-webkit-scrollbar) {
    display: none;
  }

  :global(body *) {
    transition:
      color 0.02s ease-in-out,
      background-color 0.4s ease-in-out;
  }

  :global(.quick-transition) {
    transition:
      color 0.2s ease-in-out,
      background-color 0.2s ease-in-out;
  }

  :global(button), :global(.checkbox-custom) {
    cursor: pointer;

    :global(&:focus-visible) {
      outline: 1px solid var(--color-text);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(body),
    :global(body *),
    :global(.quick-transition) {
      transition: none;
    }
  }

  // Firefox
  :global(html) {
    scrollbar-width: none;
  }
</style>
