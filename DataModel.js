
import firebase from 'firebase';
import '@firebase/firestore';
import '@firebase/storage';
import { firebaseConfig } from './Secrets';

class DataModel {
  constructor() {
    // connect to firebase and get refs
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.currentImageRef = firebase.firestore().doc('images/currentImage');
    this.storageRef = firebase.storage().ref();

    this.theImage = undefined;
    this.theCallback = undefined;
    this.loadImage();
  }

  loadImage = async () => {
    let imageDocSnap = await this.currentImageRef.get();
    this.theImage = imageDocSnap.data();
    console.log("got image info", this.theImage);
    if (this.theCallback) {
      this.theCallback(this.theImage);
    }
  }

  subscribeToImageUpdate = (callback) => {
    this.theCallback = callback;
  }

  updateImage = async (imageObject) => {
    //imageObject format: {uri: xxx, width: yyy, height: zzz}
    this.theImage = imageObject;

    // invoke the callback right away, OK if the storage takes a bit longer
    if (this.theCallback) {
      this.theCallback(imageObject);
    }

    // Set up storage refs and download URL
    let fileName = '' + Date.now();
    let imageRef = this.storageRef.child(fileName);
    
    // fetch the image object from the local filesystem
    let response = await fetch(imageObject.uri);
    let imageBlob = await response.blob();

    // then upload it to Firebase Storage
    await imageRef.put(imageBlob);

    // ... and update the current image Document in Firestore
    let downloadURL = await imageRef.getDownloadURL();

    // create a DIFFERENT object to shove into Firebase
    let fbImageObject = {
      height: imageObject.height,
      width: imageObject.width,
      uri: downloadURL
    }
//    imageObject.uri = downloadURL; // replace local URI with permanent one
    await this.currentImageRef.set(fbImageObject);

    // if (this.theCallback) {
    //   this.theCallback(imageObject);
    // }
  }
}

let theDataModel = undefined;

export function getDataModel() {
  if (!theDataModel) {
    theDataModel = new DataModel();
  }
  return theDataModel;
}