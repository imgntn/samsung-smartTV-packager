function route(handle, pathname, response, request) {
  var root = pathname.split('/')[1];
  console.log(pathname);

  if (typeof handle[root] === 'function') {
    handle[root](response, pathname, request);
  } else {
    console.log("No request handler found for " + pathname + " (" + root + ")");
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not found");
    response.end();
  }
}

exports.route = route;