<script lang="ts">
  import Card from "~popup/Card.svelte";
  import Header from "~popup/Header/Header.svelte";
</script>

<Header />

<Card></Card>

<style global>
  body[data-theme="light"] {
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
    --button-disabled-icon-color: #bcc0c8;
    --button-disabled-bg: #f5f6fc;
    --button-disabled-border-color: rgba(188, 192, 200, 0.5);

    --switch-thumb-bg: var(--action-bg-color);
    --switch-thumb-shadow: 0px 4px 4px 0px rgba(112, 97, 237, 0.25);
    --switch-track-bg: #f5f6fc;
    --switch-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --switch-disabled-thumb-bg: #bcc0c8;
    --switch-disabled-thumb-shadow: 0px 4px 4px 0px rgba(188, 192, 200, 0.25);
    --switch-disabled-track-bg: #f5f6fc;
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

  body[data-theme="dark"] {
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
    --button-shortcut-border: #35373a;
    --button-shortcut-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.09);

    --button-shortcut-active-color: #ffffff;
    --button-shortcut-active-bg: var(--action-bg-color);
    --button-shortcut-active-border-color: var(--button-shortcut-active-bg);

    --button-shortcut-error-color: #ffffff;
    --button-shortcut-error-bg: #ff4d4f;
    --button-shortcut-error-border-color: currentColor;

    --button-reset-color: #ffffff;
    --button-reset-bg: #1b1b1b;
    --button-reset-border-color: #35373a;

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

    --switch-disabled-thumb-bg: #35373a;
    --switch-disabled-thumb-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;
    --switch-disabled-track-bg: #1b1b1b;
    --switch-disabled-track-bg-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.04) inset;

    --textbox-color: #ffffff;
    --textbox-bg: #1b1b1b;
    --textbox-border: #35373a;
    --textbox-suffix-color: var(--action-bg-color);

    --textbox-color-disabled: var(--button-disabled-color);
    --textbox-bg-disabled: var(--button-disabled-bg);

    --checkbox-bg: var(--action-bg-color);
    --checkbox-bg-disabled: #707276;
  }

  body {
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

  ::-webkit-scrollbar {
    display: none;
  }

  body * {
    transition:
      color 0.02s ease-in-out,
      background-color 0.4s ease-in-out;
  }

  .quick-transition {
    transition:
      color 0.2s ease-in-out,
      background-color 0.2s ease-in-out;
  }

  button, .checkbox-custom {
    cursor: pointer;

    &:focus-visible {
      outline: 1px solid var(--color-text);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body,
    body *,
    .quick-transition {
      transition: none;
    }
  }

  /* Firefox */
  html {
    scrollbar-width: none;
  }
</style>
