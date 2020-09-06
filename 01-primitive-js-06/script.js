alert("Async alert (the contents may or may not be loaded)");
window.onload = function() {
  alert("At this point, the contents have already been loaded");
};
