from datetime import datetime, date, time

############################################
# Definition of Classes
############################################

class Stock:

    def __init__(self, symbol: str, name: str, price: float, changePercent: float, updatedAt: date):
        self.symbol = symbol
        self.name = name
        self.price = price
        self.changePercent = changePercent
        self.updatedAt = updatedAt
        
    @property
    def price(self) -> float:
        return self.__price

    @price.setter
    def price(self, price: float):
        self.__price = price

    @property
    def symbol(self) -> str:
        return self.__symbol

    @symbol.setter
    def symbol(self, symbol: str):
        self.__symbol = symbol

    @property
    def changePercent(self) -> float:
        return self.__changePercent

    @changePercent.setter
    def changePercent(self, changePercent: float):
        self.__changePercent = changePercent

    @property
    def updatedAt(self) -> date:
        return self.__updatedAt

    @updatedAt.setter
    def updatedAt(self, updatedAt: date):
        self.__updatedAt = updatedAt

    @property
    def name(self) -> str:
        return self.__name

    @name.setter
    def name(self, name: str):
        self.__name = name

class CryptoPrice:

    def __init__(self, symbol: str, name: str, priceUSD: float, change24h: float, updatedAt: date):
        self.symbol = symbol
        self.name = name
        self.priceUSD = priceUSD
        self.change24h = change24h
        self.updatedAt = updatedAt
        
    @property
    def updatedAt(self) -> date:
        return self.__updatedAt

    @updatedAt.setter
    def updatedAt(self, updatedAt: date):
        self.__updatedAt = updatedAt

    @property
    def change24h(self) -> float:
        return self.__change24h

    @change24h.setter
    def change24h(self, change24h: float):
        self.__change24h = change24h

    @property
    def priceUSD(self) -> float:
        return self.__priceUSD

    @priceUSD.setter
    def priceUSD(self, priceUSD: float):
        self.__priceUSD = priceUSD

    @property
    def symbol(self) -> str:
        return self.__symbol

    @symbol.setter
    def symbol(self, symbol: str):
        self.__symbol = symbol

    @property
    def name(self) -> str:
        return self.__name

    @name.setter
    def name(self, name: str):
        self.__name = name

class ForecastDay:

    def __init__(self, date: str, weatherCode: int, tempMax: float, tempMin: float, city_1: "City" = None):
        self.date = date
        self.weatherCode = weatherCode
        self.tempMax = tempMax
        self.tempMin = tempMin
        self.city_1 = city_1
        
    @property
    def date(self) -> str:
        return self.__date

    @date.setter
    def date(self, date: str):
        self.__date = date

    @property
    def tempMin(self) -> float:
        return self.__tempMin

    @tempMin.setter
    def tempMin(self, tempMin: float):
        self.__tempMin = tempMin

    @property
    def tempMax(self) -> float:
        return self.__tempMax

    @tempMax.setter
    def tempMax(self, tempMax: float):
        self.__tempMax = tempMax

    @property
    def weatherCode(self) -> int:
        return self.__weatherCode

    @weatherCode.setter
    def weatherCode(self, weatherCode: int):
        self.__weatherCode = weatherCode

    @property
    def city_1(self):
        return self.__city_1

    @city_1.setter
    def city_1(self, value):
        # Bidirectional consistency
        old_value = getattr(self, f"_ForecastDay__city_1", None)
        self.__city_1 = value
        
        # Remove self from old opposite end
        if old_value is not None:
            if hasattr(old_value, "hasForecastDays"):
                opp_val = getattr(old_value, "hasForecastDays", None)
                if isinstance(opp_val, set):
                    opp_val.discard(self)
                
        # Add self to new opposite end
        if value is not None:
            if hasattr(value, "hasForecastDays"):
                opp_val = getattr(value, "hasForecastDays", None)
                if opp_val is None:
                    setattr(value, "hasForecastDays", set([self]))
                elif isinstance(opp_val, set):
                    opp_val.add(self)

class WeatherSnapshot:

    def __init__(self, temperature: float, feelsLike: float, windSpeed: float, humidity: int, weatherCode: int, description: str, recordedAt: date, city: "City" = None):
        self.temperature = temperature
        self.feelsLike = feelsLike
        self.windSpeed = windSpeed
        self.humidity = humidity
        self.weatherCode = weatherCode
        self.description = description
        self.recordedAt = recordedAt
        self.city = city
        
    @property
    def temperature(self) -> float:
        return self.__temperature

    @temperature.setter
    def temperature(self, temperature: float):
        self.__temperature = temperature

    @property
    def weatherCode(self) -> int:
        return self.__weatherCode

    @weatherCode.setter
    def weatherCode(self, weatherCode: int):
        self.__weatherCode = weatherCode

    @property
    def humidity(self) -> int:
        return self.__humidity

    @humidity.setter
    def humidity(self, humidity: int):
        self.__humidity = humidity

    @property
    def recordedAt(self) -> date:
        return self.__recordedAt

    @recordedAt.setter
    def recordedAt(self, recordedAt: date):
        self.__recordedAt = recordedAt

    @property
    def windSpeed(self) -> float:
        return self.__windSpeed

    @windSpeed.setter
    def windSpeed(self, windSpeed: float):
        self.__windSpeed = windSpeed

    @property
    def description(self) -> str:
        return self.__description

    @description.setter
    def description(self, description: str):
        self.__description = description

    @property
    def feelsLike(self) -> float:
        return self.__feelsLike

    @feelsLike.setter
    def feelsLike(self, feelsLike: float):
        self.__feelsLike = feelsLike

    @property
    def city(self):
        return self.__city

    @city.setter
    def city(self, value):
        # Bidirectional consistency
        old_value = getattr(self, f"_WeatherSnapshot__city", None)
        self.__city = value
        
        # Remove self from old opposite end
        if old_value is not None:
            if hasattr(old_value, "hasWeatherSnapshot"):
                opp_val = getattr(old_value, "hasWeatherSnapshot", None)
                if opp_val == self:
                    setattr(old_value, "hasWeatherSnapshot", None)
                
        # Add self to new opposite end
        if value is not None:
            if hasattr(value, "hasWeatherSnapshot"):
                opp_val = getattr(value, "hasWeatherSnapshot", None)
                setattr(value, "hasWeatherSnapshot", self)

class CurrencyRate:

    pass
class City:

    pass
class SearchHistory:

    pass