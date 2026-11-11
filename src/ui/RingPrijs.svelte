<script lang="ts">
  /** Een prijs in gouden ringen: een ringetje met het getal. */
  let { prijs, duur = false }: { prijs: number; duur?: boolean } = $props();
</script>

<span class="prijs" class:duur>
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="14" fill="none" stroke="#b45309" stroke-width="9" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="6" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.5" />
  </svg>
  {prijs}
</span>

<style>
  .prijs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 14px 2px 6px;
    border-radius: 999px;
    font-size: 26px;
    font-weight: 700;
    color: #3b1d00;
    background: linear-gradient(180deg, #fff7c2, #fde68a);
    box-shadow: 0 3px 0 #92400e;
    white-space: nowrap;
  }
  svg {
    width: 26px;
    height: 26px;
  }
  .duur {
    filter: grayscale(0.85) brightness(0.8);
  }
</style>
