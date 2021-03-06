var util 			 = require('util');
var TweetAnalyzer    = require('./tweetAnalyzer.js');
var https            = require('https');


// data, here, came from the front end, contains the parameters to define the query to Twitter. response, 
// request, are from the main server, so when response.write() is used, it goes back to the front end.
this.query = function(data, response, request, wordBank){ 

	console.log('ID IS: ')
	console.log(data.id)

	// Here's a sample query string: 
	//'/1.1/search/tweets.json?q=DonaldTrump%20since%3A2016-03-25%20until%3A2016-03-28&count=3'.
	// Note the full customization via user parameters.
	var queryString = '/1.1/search/tweets.json?q=' + data.subject 
	                + '%20since%3A' + parseDate(data.start) 
	                + '%20until%3A' + parseDate(data.end)
	                + '&max_id='  + (data.id)
	                + '&count=100';

	// Fairly standard get request, using a user-parameterized search string. The code that produced my 
	// access token is in env.js.
	var options = {
		'path'	   : queryString,
		'hostname' : 'api.twitter.com',
		'method'   : 'GET',
		'headers'  : {'Authorization': ('Bearer ' + process.env.BEARER_ACCESS_TOKEN)},
	};

	// Must use https, as per Twitter application-only requirements. 
	var req = new https.request(options, function(res){
		var responseString = ""; 

		// As data arrives in chunks, add it to the string.
		res.on('data', function(tweet){
			responseString += tweet; 
		})

		// 'end' indicates all the data from the query is done sending. responseString can now be parsed 
		// into an object which contains 'statuses', which contains an array of the individual tweets as 
		// JSON objects. Loop through that array, pass each tweet to tweetAnalyzer, then write the result 
		// to the front end. Use a timeout to throttle the writing, so the geocoders don't fail.
		res.on('end', function(){ 
			var tweets = JSON.parse(responseString).statuses;
			var i;
			var result; 
			for (i = 0; i < tweets.length; i++){ 
				(function intervalClosure(i){
					setTimeout(function(){    
						result = TweetAnalyzer.analyze(tweets[i], wordBank); 
						if (result){
							response.write(JSON.stringify(result)); 
						}
					}, i * 500); 									       
				})(i);
			};	
		});

		res.on('error', function(error){
			console.log("Error in restServlet: " + error);
			throw error;
		})

	})

	// A request must be ended in order to be sent to the API. 
	req.end();
	
	// Helper function for the above formation of queryString; takes 'month/day/year' format, returns
	// what Twitter needs: 'YYYY-MM-DD'
	function parseDate(date){
		date = date.split('%2F');
		return (date[2] + '-' + checkSingle(date[0]) + '-' + checkSingle(date[1])); 
		function checkSingle(digit){ 
			if (digit.length == 1){ 
				digit = '0' + digit;
			}
			return digit;
		}
	}		
}