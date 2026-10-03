if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.log("Sidaaman Enweq offline mode ready.");
      })
      .catch(error => {
        console.error("Offline mode error:", error);
      });
  });
}
