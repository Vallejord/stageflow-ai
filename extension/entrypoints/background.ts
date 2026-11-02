// Al tocar el ícono de StageFlow se abre el panel lateral.
export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
})
