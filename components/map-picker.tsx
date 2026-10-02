"use client"

import { useState,useEffect,useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin,Search,X } from "@/components/ui/icons"

// Declare types for Google Maps API
declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: any) => google.maps.Map;
        Marker: new (options: any) => google.maps.Marker;
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
        Geocoder: new () => google.maps.Geocoder;
        MapMouseEvent: any;
        MapsEventListener: any;
      }
    }
  }
}

// Mock events for testing

// Ambient Google Maps types (the script is loaded at runtime, there is no @types package here).
// Namespaces are how those globals are declared.
/* eslint-disable @typescript-eslint/no-namespace */
// Declare the google namespace if it doesn't exist
declare namespace google {
  namespace maps {
    interface MapsEventListener {
      remove(): void;
    }
  }
}

// Namespace for Google Maps types
namespace google.maps {
  export interface MapOptions {
    center?: LatLng;
    zoom?: number;
  }

  export interface LatLng {
    lat(): number;
    lng(): number;
  }

  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export interface MapMouseEvent {
    latLng: LatLng;
  }

  export interface MarkerOptions {
    position?: LatLng;
    map?: Map | null;
  }

  export interface Map {
    setCenter(latLng: LatLng): void;
    setZoom(zoom: number): void;
    addListener(event: "click", callback: (e: MapMouseEvent) => void): void;
    addListener(event: string, callback: (...args: unknown[]) => void): void;
  }

  export interface Marker {
    setPosition(latLng: LatLng): void;
    setMap(map: Map | null): void;
    getPosition(): LatLng | null;
    addListener(event: string, callback: (...args: unknown[]) => void): google.maps.MapsEventListener;
  }

  export interface Geocoder {
    geocode(request: { address: string }, callback: (results: Array<{ geometry: { location: LatLng } }>, status: string) => void): void;
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

interface MapPickerProps {
  label?: string
  required?: boolean
  defaultValue?: { lat: number; lng: number }
  onLocationSelect: (coordinates: { lat: number; lng: number }) => void
  error?: string
}

export function MapPicker({
  label = "Location",
  required = false,
  defaultValue = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi, India
  onLocationSelect,
  error,
}: MapPickerProps) {
  const [coordinates, setCoordinates] = useState(defaultValue)
  const [searchQuery, setSearchQuery] = useState("")
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      initMap()
      return
    }

    // Mock function for demo purposes
    // In a real implementation, you would use an actual Google Maps API key
    const loadGoogleMapsScript = () => {
      const mockGoogleMaps = () => {
        // Create a mock implementation
        window.google = {
          maps: {
            Map: class MockMap {
              constructor() {}
              setCenter() {}
              setZoom() {}
              addListener(event: string, callback: any): google.maps.MapsEventListener {
                // Store callback for later mock trigger
                const timeoutId = setTimeout(() => {
                  if (event === 'click') {
                    callback({
                      latLng: {
                        lat: () => 28.6139,
                        lng: () => 77.209,
                      }
                    });
                  } else {
                    callback();
                  }
                }, 500);
                
                // Return a MapsEventListener object that conforms to the interface
                return {
                  remove: () => {
                    // Actual implementation to clean up the listener
                    clearTimeout(timeoutId);
                  }
                };
              }
            },
            Marker: class MockMarker {
              constructor() {}
              setMap() {}
              setPosition() {}
              getPosition() {
                return {
                  lat: () => 28.6139,
                  lng: () => 77.209,
                };
              }
              addListener(event: string, callback: any): google.maps.MapsEventListener {
                // Store callback for later mock trigger
                const timeoutId = setTimeout(() => {
                  if (event === 'dragend') {
                    callback({
                      latLng: {
                        lat: () => 28.6139,
                        lng: () => 77.209,
                      }
                    });
                  } else {
                    callback();
                  }
                }, 500);
                
                // Return a MapsEventListener object that conforms to the interface
                return {
                  remove: () => {
                    // Actual implementation to clean up the listener
                    clearTimeout(timeoutId);
                  }
                };
              }
            },
            LatLng: class MockLatLng implements google.maps.LatLng {
              private _lat: number;
              private _lng: number;
              
              constructor(lat: number, lng: number) {
                this._lat = lat;
                this._lng = lng;
              }
              
              lat(): number {
                return this._lat;
              }
              
              lng(): number {
                return this._lng;
              }
            },
            Geocoder: class MockGeocoder {
              constructor() {}
              geocode(
                request: { address: string },
                callback: (
                  results: Array<{ geometry: { location: { lat: () => number; lng: () => number } } }>,
                  status: string
                ) => void
              ) {
                // Simulate geocoding with a timeout to better mimic async API behavior
                const timeoutId = setTimeout(() => {
                  callback(
                    [
                      {
                        geometry: {
                          location: {
                            lat: () => 28.6139,
                            lng: () => 77.209,
                          },
                        },
                      },
                    ],
                    "OK"
                  )
                }, 300);
                
                // This method doesn't return a MapsEventListener object in the real API
                // But we're returning the timeoutId for potential cleanup in component unmount
                return timeoutId;
              }
            },
          },
        } as any

        setMapLoaded(true)
      }

      // In a real implementation, you would load the script from Google API
      mockGoogleMaps()
    }

    loadGoogleMapsScript()
  }, [])

  useEffect(() => {
    if (mapLoaded) {
      initMap()
    }
  }, [mapLoaded])

  // Initialize map
  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return

    try {
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: new window.google.maps.LatLng(coordinates.lat, coordinates.lng),
        zoom: 15,
      })

      // Create marker
      const marker = new window.google.maps.Marker({
        position: new window.google.maps.LatLng(coordinates.lat, coordinates.lng),
        map,
        draggable: true,
      })

      // Add click event listener to map
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newCoordinates = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          }
          updateCoordinates(newCoordinates)
        }
      })

      // Add drag end event listener to marker
      marker.addListener("dragend", () => {
        const position = marker.getPosition()
        if (position) {
          const newCoordinates = {
            lat: position.lat(),
            lng: position.lng(),
          }
          updateCoordinates(newCoordinates)
        }
      })

      mapInstanceRef.current = map
      markerRef.current = marker
    } catch (error) {
      console.error("Error initializing map:", error)
    }
  }

  // Update coordinates and notify parent
  const updateCoordinates = (newCoordinates: { lat: number; lng: number }) => {
    setCoordinates(newCoordinates)
    onLocationSelect(newCoordinates)

    // Update marker position
    if (markerRef.current && window.google?.maps) {
      markerRef.current.setPosition(
        new window.google.maps.LatLng(newCoordinates.lat, newCoordinates.lng)
      )
    }

    // Center map on new coordinates
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setCenter(
        new window.google.maps.LatLng(newCoordinates.lat, newCoordinates.lng)
      )
    }
  }

  // Search for a location by address
  const searchLocation = () => {
    if (!searchQuery || !window.google?.maps) return

    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location
          const newCoordinates = {
            lat: location.lat(),
            lng: location.lng(),
          }
          updateCoordinates(newCoordinates)
        }
      })
    } catch (error) {
      console.error("Error searching location:", error)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex mb-2 space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a location"
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-10"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={searchLocation} type="button">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      <div
        ref={mapRef}
        className="h-96 w-full rounded-md border map-container"
      ></div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            value={coordinates.lat.toFixed(6)}
            onChange={(e) => {
              const lat = parseFloat(e.target.value)
              if (!isNaN(lat)) {
                updateCoordinates({ ...coordinates, lat })
              }
            }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            value={coordinates.lng.toFixed(6)}
            onChange={(e) => {
              const lng = parseFloat(e.target.value)
              if (!isNaN(lng)) {
                updateCoordinates({ ...coordinates, lng })
              }
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      
      <div className="text-sm text-muted-foreground flex items-center">
        <MapPin className="mr-1 h-3 w-3" /> Click on the map or drag the marker to set the location
      </div>
    </div>
  )
} 