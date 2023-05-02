'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;
const workOut = class {
  date = new Date();
  // id = String(new Date()).slice(-10);
  // id = (new Date() + "").slice(-10);
  id = (Date.now() + '').slice(-10);
  clicks = 0
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click(){
    this.clicks++;
  }
};

const Running = class extends workOut {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min / hr
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};

const Cycling = class extends workOut {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km / hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
};

// const run1 = new Running([32, -13], 5.2, 24, 128)
// const cyc1 = new Cycling([32, -13], 27, 95, 523)

// console.log(run1, cyc1);

//////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
const App = class {
  #map;
  #mapZoomLevel = 13 ; /*Zoom number */
  #mapEvent;
  #workouts = [];
  constructor() {
    this._getPosition();
    this._getLocateStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    //GEOLOCATION API (BROWSER API)
    // console.log(window);
    // window.alert("Hello")
    // console.log(navigator);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Please allow browser to see your location');
        }
      ); /* fail callback */
    }
  }

  _loadMap(position) {
    // console.log(position);
    const { latitude, longitude } = position.coords;
    // console.log(latitude, longitude);
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);
    // console.log(L);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // HANDLING CLICKS ON MAP
    this.#map.on('click', this._showForm.bind(this));
    /* success callback */

    this.#workouts.forEach(work =>{
      this._renderWorkoutMaker(work)
    })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // console.log(mapEvent.latlng);
    form.classList.remove('hidden');
    // inputType.focus()
    inputDistance.focus();
  }
  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // inputElevation.parentElement.classList.remove('form__row--hidden')
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    // inputElevation.parentElement.classList.remove('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get users data
    const workoutType = inputType.value;
    const workoutDistance = Number(inputDistance.value);
    const workoutDuration = Number(inputDuration.value);
    let workout;
    // console.log(mapEvent);
    // console.log(this.#mapEvent);
    const { lat, lng } = this.#mapEvent.latlng;

    //If workout is running, create running object
    if (workoutType === 'running') {
      const workoutCadence = Number(inputCadence.value);
      //Check if the data is valid
      if (
        /* 
        !Number.isFinite(workoutDistance) ||
        !Number.isFinite(workoutDuration) ||
        !Number.isFinite(workoutCadence)
        */
        !validInputs(workoutDistance, workoutDuration, workoutCadence) ||
        !allPositive(workoutDistance, workoutDuration, workoutCadence)
      )
        return alert('Inputs should be positive number');
      workout = new Running(
        [lat, lng],
        workoutDistance,
        workoutDuration,
        workoutCadence
      );
    }

    //If workout is cycling, create cycling object

    if (workoutType === 'cycling') {
      const workoutElevation = Number(inputElevation.value);
      if (
        !validInputs(workoutDistance, workoutDuration, workoutElevation) ||
        !allPositive(workoutDistance, workoutDuration)
      )
        return alert('Inputs should be positive number');
      workout = new Cycling(
        [lat, lng],
        workoutDistance,
        workoutDuration,
        workoutElevation
      );
    }

    //Add new object to workout array
    this.#workouts.push(workout);
    //  console.log(workout);

    //Render workout on map as marker
    this._renderWorkoutMaker(workout);
    //Render workout list
    this._renderWorkout(workout);
    //hide form and clear input
    this._hideForm();
    //set local storage to all workout
    this._setLocalStorage()
  }
  // DISPLAY MARKER
  _renderWorkoutMaker(workout) {
    L.marker(workout.coords /*{ opacity : 0.5, draggable : true}*/)
      .addTo(this.#map)
      .bindPopup(
        // 'Workout'
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}  ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    const icon = workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️';
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${icon}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
  `;
    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
          </div>
    </div>
    `;
    }
    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain.toFixed(
              1
            )}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if ( !workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
      );
      console.log(this.#workouts);
      console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel,{
      animate : true,
      pan :{
        duration : 1
      }
    })
    //using public interface
    workout.click()
  }
  _setLocalStorage(){
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }
  _getLocateStorage(){
    const data = JSON.parse(localStorage.getItem('workouts'))
    console.log(data);
    if(!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work =>{
      this._renderWorkout(work)
    })
  }
};
const app = new App();
// app._getPosition() /*or get position in constructor*/
// console.log(Number.isFinite(1));
// console.log(Number.isFinite('k'));
// console.log(Number.isFinite(-1));
