let map;
let animatedMarker;
const NYC_BOUNDS = {
  north: 40.9176,
  south: 40.4774,
  west: -74.2591,
  east: -73.7004
};

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 40.7128, lng: -74.0060 }, 
    restriction: {
      latLngBounds: NYC_BOUNDS,
      strictBounds: false,
    },
    mapTypeId: google.maps.MapTypeId.ROADMAP
 
   
  });
}

function handleRoute() {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!start || !end) {
    alert("Please enter both start and destination!");
    return;
  }

  checkLocationInNYC(start, end);
}

function checkLocationInNYC(start, end) {
  const geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: start }, function (startResults, startStatus) {
    if (startStatus === google.maps.GeocoderStatus.OK) {
      const startLocation = startResults[0].geometry.location;

      geocoder.geocode({ address: end }, function (endResults, endStatus) {
        if (endStatus === google.maps.GeocoderStatus.OK) {
          const endLocation = endResults[0].geometry.location;

          if (
            isWithinNYC(startLocation.lat(), startLocation.lng()) &&
            isWithinNYC(endLocation.lat(), endLocation.lng())
          ) {
            drawRoute(start, end, 'DRIVING', true, '#2196F3');
          } else {
            alert("Both locations must be within New York City!");
          }
        } else {
          alert("Invalid destination address.");
        }
      });
    } else {
      alert("Invalid start address.");
    }
  });
}

function isWithinNYC(lat, lng) {
  return (
    lat >= NYC_BOUNDS.south &&
    lat <= NYC_BOUNDS.north &&
    lng >= NYC_BOUNDS.west &&
    lng <= NYC_BOUNDS.east
  );
}

function drawRoute(start, end, method, animate = true, color = '#e53935') {
  const directionsService = new google.maps.DirectionsService();

  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.DirectionsTravelMode[method]
  };

  directionsService.route(request, function (response, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      const routePath = new google.maps.Polyline({
        path: response.routes[0].overview_path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 4
      });

      routePath.setMap(map);

      new google.maps.Marker({
        position: response.routes[0].overview_path[0],
        map: map,
        title: 'Start'
      });

      new google.maps.Marker({
        position: response.routes[0].overview_path[response.routes[0].overview_path.length - 1],
        map: map,
        title: 'Destination'
      });

      if (animate) {
        animateIcon(response.routes[0].overview_path);
      }
    } else {
      alert("Failed to get directions. Please check the locations.");
    }
  });
}

function animateIcon(path) {
  if (animatedMarker) {
    animatedMarker.setMap(null);
  }

  animatedMarker = new google.maps.Marker({
    position: path[0],
    map: map,
    icon: {
      url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", 
      scaledSize: new google.maps.Size(30, 30) 
    }
  });

  let index = 0;

  function move() {
    if (index < path.length) {
      animatedMarker.setPosition(path[index]);
      index++;
      setTimeout(move, 500); 
    } else {
      index = 0; 
      setTimeout(move, 100);
    }
  }

  move();
}
