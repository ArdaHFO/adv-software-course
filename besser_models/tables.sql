
CREATE TABLE cryptoprice (
	id INTEGER NOT NULL, 
	symbol VARCHAR(100) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	"priceUSD" FLOAT NOT NULL, 
	change24h FLOAT NOT NULL, 
	"updatedAt" DATE NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE currencyrate (
	id INTEGER NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE searchhistory (
	id INTEGER NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE stock (
	id INTEGER NOT NULL, 
	symbol VARCHAR(100) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	price FLOAT NOT NULL, 
	"changePercent" FLOAT NOT NULL, 
	"updatedAt" DATE NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE weathersnapshot (
	id INTEGER NOT NULL, 
	temperature FLOAT NOT NULL, 
	"feelsLike" FLOAT NOT NULL, 
	"windSpeed" FLOAT NOT NULL, 
	humidity INTEGER NOT NULL, 
	"weatherCode" INTEGER NOT NULL, 
	description VARCHAR(100) NOT NULL, 
	"recordedAt" DATE NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE city (
	id INTEGER NOT NULL, 
	"hasWeatherSnapshot_id" INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE ("hasWeatherSnapshot_id"), 
	FOREIGN KEY("hasWeatherSnapshot_id") REFERENCES weathersnapshot (id)
)

;


CREATE TABLE forecastday (
	id INTEGER NOT NULL, 
	date VARCHAR(100) NOT NULL, 
	"weatherCode" INTEGER NOT NULL, 
	"tempMax" FLOAT NOT NULL, 
	"tempMin" FLOAT NOT NULL, 
	city_1_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(city_1_id) REFERENCES city (id)
)

;

