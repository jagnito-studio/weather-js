
//https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&current_weather=true&timeformat=unixtime&timezone=Australia%2FSydney

navigator.geolocation.getCurrentPosition(positionSuccess, postitionError);

function positionSuccess({ coords }) {
    //getWeather(-33.96694322521347, 151.1008766116511, Intl.DateTimeFormat().resolvedOptions().timeZone)
    //.then(response => console.log(JSON.stringify(response)));
    //.then(response => console.log(response));
    console.log(coords);
    getWeather(coords.latitude, coords.longitude, Intl.DateTimeFormat().resolvedOptions().timeZone)
    .then(renderWeather)
    .catch(e => {
        console.error(e);
        alert("Error getting weather")
    })
}
function postitionError()
{
    alert("Cannot getting your location. Please allow us to use you location and refresh the page")
}

function getWeather(lat, lon, timezone)
{
    return fetch('https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&current_weather=true&timeformat=unixtime&latitude='+lat+'&longitude='+lon+'&timezone='+timezone, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response => response.json())
    // Restructure result
    .then(jsonData => {
        return {
            current: parseCurrentWeather(jsonData),
            daily: parseDailyWeather(jsonData),
            hourly: parseHourlyWeather(jsonData),
        }
    });
}

// decouple json based on object
function parseCurrentWeather({current_weather, daily}) {

    // Set current_weather.windspeed to currentTemp variable
    const {
        temperature: currentTemp,
        windspeed: windSpeed,
        weathercode: iconCode
    } = current_weather;

    // Set daily.temperature_2m_max[0th] = maxTemp
    const {
        temperature_2m_max: [maxTemp],
        temperature_2m_min: [minTemp],
        apparent_temperature_max: [maxFeelsLike],
        apparent_temperature_min: [minFeelsLike],
        precipitation_sum: [precip],
    } = daily

    return {
        currentTemp: Math.round(currentTemp),
        highTemp: Math.round(maxTemp),
        lowTemp: Math.round(minTemp),
        highFeelsLike: Math.round(maxFeelsLike),
        lowFeelsLike: Math.round(minFeelsLike),
        windSpeed: Math.round(windSpeed),
        precip: Math.round(precip * 100) / 100,
        iconCode,
    }
}

function parseDailyWeather({daily}) {
    return daily.time.map((time, index) => {
        return {
            timestamp: time * 1000,
            iconCode: daily.weathercode[index],
            maxTemp: Math.round(daily.temperature_2m_max[index]),
            minTemp: Math.round(daily.temperature_2m_min[index]),
        }
    });
}

function parseHourlyWeather({ hourly, current_weather }) {
    return hourly.time.map((time, index)=> {
        return {
            timestamp: time * 1000,
            iconCode: hourly.weathercode[index],
            temp: Math.round(hourly.temperature_2m[index]),
            feelsLike: Math.round(hourly.apparent_temperature[index]),
            windSpeed: Math.round(hourly.windspeed_10m[index]),
            precip: Math.round(hourly.precipitation[index] * 100) / 100,
        }
    }).filter(({timestamp}) => timestamp >= current_weather.time * 1000)
}

function renderWeather({ current, daily, hourly })
{
    renderCurrentWeather(current);
    renderDailyWeather(daily);
    renderHourlyWeather(hourly);
    document.body.classList.remove("blur-sm");
}

// Pass object as parent, and default parent to be document
// String interpolation
function setValue(selector, value, {parent = document} = {}) {
    parent.querySelector(`[data-${selector}`).textContent = value;
}

// Weather code
const ICON_MAP = new Map();
addIconMap([0, 1], "<i class='fa-solid fa-sun'></i>");
addIconMap([2], "<i class='fa-solid fa-cloud-sun'></i>");
addIconMap([3], "<i class='fa-solid fa-cloud'></i>");
addIconMap([45, 48], "<i class='fa-solid fa-smog'></i>");
addIconMap([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], "<i class='fa-solid fa-cloud-showers-heavy'></i>");
addIconMap([71, 73, 75, 77, 85, 86], "<i class='fa-solid fa-snowflake'></i>");
addIconMap([95, 96, 99], "<i class='fa-solid fa-cloud-bolt'></i>");

function addIconMap(values, icon) {
    values.forEach(value => {
        ICON_MAP.set(value, icon)
    })    
}

function renderCurrentWeather(current) {
    document.querySelector("[data-current-icon]").innerHTML = ICON_MAP.get(current.iconCode);
    setValue("current-temp", current.currentTemp);
    setValue("current-high", current.highTemp);
    setValue("current-fl-high", current.highFeelsLike);
    setValue("current-low", current.lowTemp);
    setValue("current-fl-low", current.lowFeelsLike);
    setValue("current-wind", current.windSpeed);
    setValue("current-precip", current.precip);
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "long", month: "short" });
const dailySelection = document.querySelector("[data-day-section]")
const dayCardTemplate = document.getElementById("day-card-template")
function renderDailyWeather(daily) {
    dailySelection.innerHTML = "";
    daily.forEach(day => {
        const element = dayCardTemplate.content.cloneNode(true)

        element.querySelector("[data-icon]").innerHTML = ICON_MAP.get(day.iconCode);

        setValue("max-temp", day.maxTemp, { parent: element });
        setValue("min-temp", day.minTemp, { parent: element });
        setValue("weekday", WEEKDAY_FORMATTER.format(day.timestamp), { parent: element });

        dailySelection.append(element);
    })
}

const HOUR_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const hourlySelection = document.querySelector("[data-hourly-section]")
const hourlyCardTemplate = document.getElementById("hourly-card-template")
function renderHourlyWeather(hourly) {
    hourlySelection.innerHTML = "";
    hourly.forEach(hour => {
        const element = hourlyCardTemplate.content.cloneNode(true)

        element.querySelector("[data-icon]").innerHTML = ICON_MAP.get(hour.iconCode);

        setValue("temp", hour.temp, { parent: element });
        setValue("fl-temp", hour.feelsLike, { parent: element });
        setValue("wind", hour.windSpeed, { parent: element });
        setValue("precip", hour.precip, { parent: element });
        setValue("weekday", WEEKDAY_FORMATTER.format(hour.timestamp), { parent: element });
        setValue("hour", HOUR_FORMATTER.format(hour.timestamp), { parent: element });

        hourlySelection.append(element);
    })
}