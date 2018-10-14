function routeHandler() {
  var markers = new Map(),
    map,
    searchedAreas = [],
    request = require('request'),
    JSONStream = require('JSONStream');

  var initMap = function() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmVsaXBlbG9wZXptYXAiLCJhIjoiY2puN2prb3M4MTM1NjNwbnYybmN5eHJnMSJ9.lS8M2ApNbTA8Hi0blrfGag';
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v10',
      center: [13.404954, 52.520008],
      zoom: 5
    });
    var nav = new mapboxgl.NavigationControl();
    map.addControl(nav, 'top-left');
    map.addControl(new mapboxgl.FullscreenControl());
    map.on('moveend', function(e) {
      getRoutes();
    });
    getRoutes();
  }

  var getRoutes = function() {
    //console.log("areas:", searchedAreas);
    if (searchedAreas.length > 0 &&
      searchedAreas.reduce(
        function(result, next) {
          return result || compareArea(next, map.getBounds());
        }, false)) {
      console.log("Area already searched", map.getBounds(), searchedAreas);
      return;
    } else {
      console.log("Area not searched: ", map.getBounds());
      searchedAreas.push(map.getBounds());
    }

    //calculate visible distance
    var from = [map.getCenter().lat, map.getCenter().lng];
    var to = [map.getBounds().getSouthWest().lat, map.getBounds().getSouthWest().lng];
    var options = {
      units: 'miles'
    };
    var maxDistance = turf.distance(from, to, options);

    var url = 'https://www.mountainproject.com/data/get-routes-for-lat-lon?' +
      'lat=' + map.getCenter().lat + '&' +
      'lon=' + map.getCenter().lng + '&' +
      'maxDistance=' + maxDistance + '&' +
      'key=200372954-0078fe17d58508600a5f342877aa43f3';
    console.log("get url: ", url);

    //get routes and draw markers
    request.get(url)
      .on('error', function(err) {
        console.log('Error getting routes: ', err);
      })
      .pipe(JSONStream.parse('routes.*'))
      .on('data', function(route) {
        //console.log("processing route: ", route);
        var markerID = route.longitude + '-' + route.latitude;
        var marker = markers.get(markerID);

        //if there is a marker but no route
        if (marker &&
          marker.routes.filter(r => r.id == route.id).length == 0) {
          //console.log("marker found updating popup: ", markerID)
          marker.routes.push(route);
          createPopUp(marker);
        } else if (!marker) { //if there is no marker
          marker = new mapboxgl.Marker()
            .setLngLat([route.longitude, route.latitude])
            .addTo(map);
          marker.routes = [route];
          createPopUp(marker);
          markers.set(markerID, marker);
          //console.log("new marker: ", markerID)
        }
      });
  }

  var createPopUp = function(marker) {
    var popup = new mapboxgl.Popup({
        offset: 25
      })
      .setHTML(
        '<span class="popup-title">Routes:</span><div>' +
        marker.routes.map(route => {
          //console.log("route: ", route);
          return '<a id="rlink-' + route.id + '" target="_blank" href="' + route.url + '">' + route.name + '</a>';
        }).join('<br/>') +
        '</div>');
    marker.setPopup(popup);
  }

  var compareArea = function(searched, bounds) {
    var searchedSquareArray = [];
    searchedSquareArray.push(searched.getSouthWest().toArray());
    searchedSquareArray.push(searched.getSouthEast().toArray());
    searchedSquareArray.push(searched.getNorthEast().toArray());
    searchedSquareArray.push(searched.getNorthWest().toArray());
    searchedSquareArray.push(searched.getSouthWest().toArray());

    var boundsSquareArray = [];
    boundsSquareArray.push(bounds.getSouthWest().toArray());
    boundsSquareArray.push(bounds.getSouthEast().toArray());
    boundsSquareArray.push(bounds.getNorthEast().toArray());
    boundsSquareArray.push(bounds.getNorthWest().toArray());
    boundsSquareArray.push(bounds.getSouthWest().toArray());

    //console.log("squares: ", searchedSquareArray, boundsSquareArray);

    var searchedSquare = turf.polygon([searchedSquareArray]);
    var boundsSquare = turf.polygon([boundsSquareArray]);
    //console.log("contained: ", searchedSquare, boundsSquare);
    var contained = turf.booleanContains(searchedSquare, boundsSquare);

    return contained;
  }

  return {
    initMap: initMap
  }
}
module.exports = routeHandler;
