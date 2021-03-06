// Creates a circle on the map using the tweets mood (RGB values) as its
// color, the tweet's location as its coordinates, and the tweet user's
// number of followers to set its radius (more followers = a bigger radius,
// or reach.)
function createTweetCircle(tweet, center){
  var radius = setRadius();
  var color = 'RGB(' + tweet.stats.mood.toString() + ')';                    
  var tweetCircle = setTweetCircle();
  tweetCircle.initListeners();

  // The id will help Twitter recognize the oldest or most recent tweet
  // displayed on the front end. Note the ._ prefix to the function 
  // call. I use this convention for all functions I manually added
  // to prototypes.  
  tweetCircle._setId(tweet.id);

  // Storing the circles in the map allows for their visiblity to be toggled, 
  // and have their id's retrieved when needed. 
  tweetCircle._storeInMap(map);

  // This created a clickable href in a crawl to the right of the map. Clicking
  // on it causes the map to pan to this circle's center, and reset the map zoom.
  linkToCircle();

  // Google Map Circle radii are measured in meters, so tweets with a small number
  // of followers needs to be multiplied considerably to be visible on the map. 
  // But, this same factor makes larger tweets way too big. The function I use below
  // is unsimplified, to make it more obvious what factors are leading to the curve.
  // In short, the farther below 50k followers a user has, the larger the multiplier
  // will be. The .0000095 smoothes out the curve. (This is highly subject to change.)
  function setRadius(){
    var rad = tweet.stats.reach;
    if (rad){
      rad > 50000 ? rad *= 20 : rad = ((500000 - 10 * rad) * .000095 * rad);
    } else {
      // 4000 is the default, for a user with no followers. 
      rad = 4000;
    }
    return rad;
  }

  // Set the starting properties of this circle. 
  function setTweetCircle(){
    var circle = new google.maps.Circle({
      'strokeColor'  : color,
      'strokeOpacity': .8,
      'strokeWeight' : 2,
      'fillColor'    : color,
      'fillOpacity'  : .35, 
      'map'          : map,
      'center'       : center,
      'radius'       : radius,
      'draggable'    : true,
      'clickable'    : true,
      'geodesic'     : false,
    });

    // Each circle has its own Info Window object following it around, displaying
    // information about the tweet that originated it. 
    circle.infoWindow = initInfoWindow(); 

    // Set the Info Window with xml from the tweet's stats/info.
    function initInfoWindow(){           
      var content = 
      '<div id="info">' +
          '<div class="info-title">' + tweet.user.name + '</div>' +
          '<div class="info-content">' +
            '<p>' + tweet.text + '</p>' + 
            '<p>Location: ' + tweet.location + 
            '<br>Created At: ' + tweet.stats.time +             
            '<br>Inferred Mood: ' + tweet.stats.mood + 
            '<br>Positive Words: ' + JSON.stringify(tweet.stats.posWords) + 
            '<br>Negitive Words: ' + JSON.stringify(tweet.stats.negWords) +                         
            '<br>Reach: ' + tweet.stats.reach + '</p>'+
          '</div>' +
      '</div>';

      return  new google.maps.InfoWindow({
        'content'        : content,
        'maxWidth'       : 350,
        'disableAutoPan' : true,
      });
    }

    // The circle has its own listeners, detecting events such as drag, mouseover, etc.
    circle.initListeners = function(){
      // These 2 lines assign variables that will be set and reset through these listeners.
      var holdWindow = false;
      var timer = null;

      // Sets a listener that triggers whenever the cursor passes over this circle.
      this.addListener('mouseover', function(){

        // Without this condition, the info Window stays open, after clicked the first time, until
        // you click it again. With this, the info window closes after the next time the mouseover
        // occurs (leads to much cleaner viewing.)
        if (holdWindow){
          holdWindow = false
        };

        // Before opening the window, it must be anchored to the circle. 
        anchorInfoWindow(this);     

        // When the cursor passes over, make a small increase in circle radius, to clarify which 
        // circle is currently under the cursor.       
        explodeView();

        // Open up the map, now that all the above properties have been set.                 
        this.infoWindow.open(map);

        function explodeView(){
          circle.setRadius(radius * 1.15);
        }  
      });

      // Set the timer to clear, reset the radius (undoes explodeView), and close the window, if 
      // holdWindow is not true, on a 'mouseout' event.
      this.addListener('mouseout', function(){
        clearTimer();
        this.setRadius(radius);        
        if (!holdWindow){
          this.infoWindow.close(map);
        }
      });

      // The timer is cleared when dragging starts, and the window is invisible during the drag. 
      this.addListener('drag', function(){
        this.infoWindow.setMap(null);
        clearTimer();
      });

      // Re-anchor the window to this circle's current location, clear the timer, show the info
      // window when dragging stops. 
      this.addListener('dragend', function(){
        anchorInfoWindow(this);
        clearTimer();           
        this.infoWindow.setMap(map);
      });

      // When a circle is clicked, it will tell the info window to stay open after the first 
      // mouseout event occurs. After the next mouseout event, this is undone, and the window
      // will close, unless the circle is clicked again. 
      this.addListener('click', function(){
        !holdWindow ? holdWindow = true : holdWindow = false;
      });              

      // On a double click, the circle is invisible. It can be visible again by clicking the
      // Show Circles button below the map. 
      this.addListener('dblclick', function(){
        clearTimer();
        this.infoWindow.setMap(null);
        this.setMap(null);
      });

      // Sets the info window's display center to be just northeast of the circle's outer edge. 
      // (The position is subject to change, just picked a placement I liked.)
      function anchorInfoWindow(circle){
        var cen = circle.getCenter();
        var span = circle.getBounds().toSpan();
        var latLng = {'lat': cen.lat() + (span.lat() / 2.3), 'lng': cen.lng() + (span.lng() / 2.3) };
        circle.infoWindow.setPosition(latLng);                    
      }  

      // A helper function to make sure the timer is clearing (setting it to null is a fail-safe). 
      // When the timer wasn't working as expected, info windows were staying open all over the 
      // place, so I felt this was worthwhile to implement. 
      function clearTimer(){
        clearInterval(timer);
        timer = null;
      }          
    }
    return circle; 
  }

  // Appends an href to the crawl to the right of the map. The href has the tweet's text and is color-
  // coded to its mood (same color as the circle). 
  function linkToCircle(){
    var a = document.createElement('a');
    a.innerHTML = tweet.text + "<br><br>";
    a.style.color = color;
    a.style['text-decoration'] = 'none';
    a.style['text-shadow'] = '1px 1px 1px rgb(220,220,220)';

    // zoomLevel is either 6 (more zoom) for anywhere other than the location for non-located tweets, 
    // or 5 (less zoom) for the default coordinates. Calling this function, as executed by clicking
    //  the href, will pan the map over to the circle's center .
    panToCircle = function(latLng){
      var lat = Number(latLng[0]);
      var lng = Number(latLng[1]);
      var zoomLevel = (lat.toFixed(0) == DefaultCenter.lat.toFixed(0) && lng.toFixed(0) == DefaultCenter.lng.toFixed(0)) 
                    ? 5 : 6;     
      var cen = {'lat': lat, 'lng': lng};
      map.setZoom(zoomLevel);              
      map.panTo(cen);
    }

    // I had originally tried putting the circle in the href directly, but it kept using the coordinates
    // of the last circle to be drawn on the map, not the circle that was 'this' circle when this function
    // was executed. To fix that, I concatenated a string containing the 'this' circle coordinates 
    // into the href. This holds the values fixed in the href string in the DOM. 
    var centerString = center.lat.toString() + ',' + center.lng.toString();
    a.href = 'javascript:panToCircle([' + centerString + ']);'
    document.getElementById('text').appendChild(a);
  }          
}