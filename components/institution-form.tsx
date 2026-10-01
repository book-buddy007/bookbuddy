"use client"

import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { MapPicker } from "./map-picker"
import { Building2, CircleDashed, Check, Plus, Trash, X } from "@/components/ui/icons"

// Define validation schema for institution data
const institutionFormSchema = z.object({
  // Section 1: Basic Info
  schoolName: z.string().min(5, {
    message: "Institution name must be at least 5 characters.",
  }).max(100, {
    message: "Institution name cannot exceed 100 characters."
  }),
  establishedYear: z.coerce.number().min(1800, {
    message: "Established year must be at least 1800."
  }).max(new Date().getFullYear(), {
    message: `Established year cannot be later than ${new Date().getFullYear()}.`
  }),
  recognitionNumber: z.string().min(1, {
    message: "Network ID is required."
  }),

  // Section 2: Key Officials
  principal: z.object({
    name: z.string().min(2, {
      message: "Director name must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    mobile: z.string().regex(/^[6-9]\d{9}$/, {
      message: "Please enter a valid Indian mobile number.",
    }),
  }),
  librarian: z.object({
    name: z.string().min(2, {
      message: "Head Librarian name must be at least 2 characters.",
    }),
    contact: z.string().regex(/^[6-9]\d{9}$/, {
      message: "Please enter a valid Indian mobile number.",
    }),
  }),

  // Section 3: Contact Details
  headquarters: z.object({
    address: z.string().min(5, {
      message: "Address must be at least 5 characters.",
    }),
    city: z.string().min(2, {
      message: "City must be at least 2 characters.",
    }),
    state: z.string().min(2, {
      message: "State must be at least 2 characters.",
    }),
    pinCode: z.string().regex(/^\d{6}$/, {
      message: "Please enter a valid 6-digit PIN code.",
    }),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  website: z.string().regex(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/, {
    message: "Please enter a valid URL or domain name.",
  }).optional().or(z.literal("")),
  contactNumbers: z.array(
    z.string().regex(/^[6-9]\d{9}$/, {
      message: "Please enter a valid Indian mobile number.",
    })
  ).min(1, {
    message: "At least one contact number is required.",
  }),

  // Section 4: Branch Details
  branches: z.array(
    z.object({
      name: z.string().min(2, {
        message: "Branch name must be at least 2 characters.",
      }),
      address: z.string().min(5, {
        message: "Branch address must be at least 5 characters.",
      }),
      inCharge: z.string().min(2, {
        message: "In-charge name must be at least 2 characters.",
      }),
      studentStrength: z.coerce.number().min(1, {
        message: "Student strength must be at least 1.",
      }),
    })
  ).optional(),
})

export type InstitutionFormValues = z.infer<typeof institutionFormSchema>

interface InstitutionFormProps {
  defaultValues?: Partial<InstitutionFormValues>
  onSubmit: (data: InstitutionFormValues) => void
  isEditing?: boolean
}

export function InstitutionForm({
  defaultValues,
  onSubmit,
  isEditing = false,
}: InstitutionFormProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Form steps
  const steps = [
    { title: "Basic Info", description: "Institution identity and network details" },
    { title: "Officials", description: "Director and librarian details" },
    { title: "Location", description: "Headquarters and contact information" },
    { title: "Branches", description: "Additional library reading rooms" },
  ]

  // Initialize form with default values
  const form = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionFormSchema),
    defaultValues: defaultValues || {
      schoolName: "",
      establishedYear: new Date().getFullYear(),
      recognitionNumber: "",
      principal: {
        name: "",
        email: "",
        mobile: "",
      },
      librarian: {
        name: "",
        contact: "",
      },
      headquarters: {
        address: "",
        city: "",
        state: "",
        pinCode: "",
        coordinates: { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
      },
      website: "",
      contactNumbers: [""],
      branches: [],
    },
  })

  // Add a contact number
  const addContactNumber = () => {
    const currentNumbers = form.getValues("contactNumbers")
    form.setValue("contactNumbers", [...currentNumbers, ""])
  }

  // Remove a contact number
  const removeContactNumber = (index: number) => {
    const currentNumbers = form.getValues("contactNumbers")
    if (currentNumbers.length > 1) {
      form.setValue(
        "contactNumbers",
        currentNumbers.filter((_, i) => i !== index)
      )
    }
  }

  // Add a branch
  const addBranch = () => {
    const currentBranches = form.getValues("branches") || []
    form.setValue("branches", [
      ...currentBranches,
      { name: "", address: "", inCharge: "", studentStrength: 0 },
    ])
  }

  // Remove a branch
  const removeBranch = (index: number) => {
    const currentBranches = form.getValues("branches") || []
    form.setValue(
      "branches",
      currentBranches.filter((_, i) => i !== index)
    )
  }

  // Handle form submission
  async function handleSubmit(data: InstitutionFormValues) {
    try {
      onSubmit(data)
      toast({
        title: isEditing
          ? "Institution updated successfully"
          : "Institution created successfully",
        description: "The school profile has been saved.",
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "An error occurred",
        description: "Could not save institution data. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Navigation between steps
  const nextStep = async () => {
    // Validate the current step before moving to the next
    const stepFields = getFieldsForStep(currentStep)

    const isValid = await form.trigger(stepFields as any)
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1)
        window.scrollTo(0, 0)
      } else {
        // If on the last step, submit the form
        form.handleSubmit(handleSubmit)()
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo(0, 0)
    }
  }

  // Get the fields for the current step
  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 0:
        return ["schoolName", "establishedYear", "recognitionNumber"]
      case 1:
        return ["principal", "librarian"]
      case 2:
        return ["headquarters", "website", "contactNumbers"]
      case 3:
        return ["branches"]
      default:
        return []
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper indicator */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex flex-col items-center ${index > 0 ? "flex-1" : ""
              }`}
          >
            {index > 0 && (
              <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                <div
                  className={`h-full absolute top-0 left-0 bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] transition-all duration-500 ease-in-out`}
                  style={{
                    width: index <= currentStep ? '100%' : '0%',
                  }}
                ></div>
              </div>
            )}
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 ease-in-out relative z-10 ${index < currentStep
                ? "border-transparent bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] text-white shadow-md shadow-[var(--saffron)]/20"
                : index === currentStep
                  ? "border-[var(--deep-saffron)] text-[var(--deep-saffron)] bg-white dark:bg-slate-900 shadow-sm shadow-[var(--saffron)]/10"
                  : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-950"
                }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5 transition-opacity duration-300" />
              ) : (
                <CircleDashed className="h-5 w-5 transition-opacity duration-300" />
              )}
            </div>
            <div className="mt-2 text-center">
              <div
                className={`text-sm font-medium transition-colors duration-300 ${index <= currentStep
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-500"
                  }`}
              >
                {step.title}
              </div>
              <div className="text-xs text-muted-foreground hidden md:block">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form>
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <Card className="border-slate-200/60 dark:border-slate-700/40 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/40 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--deep-saffron)]/10 text-[var(--deep-saffron)]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Institution Details
                </CardTitle>
                <CardDescription>
                  Enter basic information about your partner institution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter institution name" {...field} />
                      </FormControl>
                      <FormDescription>
                        The official name of the institution
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="establishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Established</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Year"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The year the institution was established
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recognitionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Library Network ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Network Node ID"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your assigned network identification code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Officials */}
          {currentStep === 1 && (
            <Card className="border-slate-200/60 dark:border-slate-700/40 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/40 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Key Officials
                </CardTitle>
                <CardDescription>
                  Contact information for institution administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Director / Principal Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="principal.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Director's name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="principal.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Official email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="principal.mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile number" {...field} />
                          </FormControl>
                          <FormDescription>
                            Indian mobile number starting with 6-9
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Head Librarian Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="librarian.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Librarian's name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="librarian.contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Location */}
          {currentStep === 2 && (
            <Card className="border-slate-200/60 dark:border-slate-700/40 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/40 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--saffron)]/10 text-[var(--saffron)]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Contact Details
                </CardTitle>
                <CardDescription>
                  Address and contact information for your school
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Headquarters</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="headquarters.address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Complete address"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="headquarters.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="headquarters.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="headquarters.pinCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code</FormLabel>
                          <FormControl>
                            <Input placeholder="6-digit PIN code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="headquarters.coordinates"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <MapPicker
                                label="Main Campus Location"
                                required
                                defaultValue={field.value}
                                onLocationSelect={(coordinates) => {
                                  field.onChange(coordinates)
                                }}
                                error={form.formState.errors.headquarters?.coordinates?.message as string}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.yourschool.edu" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your institution's official website URL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>Contact Numbers</FormLabel>
                  <FormDescription className="mb-2">
                    Add one or more contact numbers for your institution
                  </FormDescription>
                  {form.getValues("contactNumbers").map((_, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`contactNumbers.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="10-digit mobile number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeContactNumber(index)}
                        disabled={form.getValues("contactNumbers").length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContactNumber}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Contact Number
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Branches */}
          {currentStep === 3 && (
            <Card className="border-slate-200/60 dark:border-slate-700/40 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/40 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Library Branch Details
                </CardTitle>
                <CardDescription>
                  Add information about reading rooms or specific library branches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(form.getValues("branches") || []).length === 0 ? (
                  <div className="text-center py-8 border rounded-md bg-muted/10">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No branches added</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add reading rooms if your institution has multiple libraries
                    </p>
                    <Button type="button" onClick={addBranch}>
                      <Plus className="mr-2 h-4 w-4" /> Add Branch
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 branch-grid">
                      {(form.getValues("branches") || []).map((_, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                Branch {index + 1}
                              </CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBranch(index)}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`branches.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Branch Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Campus name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`branches.${index}.address`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Branch address"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`branches.${index}.inCharge`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>In-Charge</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Branch in-charge name"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`branches.${index}.studentStrength`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Active Readers</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="Max capacity / members"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addBranch}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Another Branch
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={nextStep}
              className="bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] hover:from-[var(--saffron)] hover:to-[var(--gold)] text-white shadow-md hover:shadow-lg transition-all rounded-xl"
            >
              {currentStep === steps.length - 1 ? "Save Institution Profile" : "Next Step"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 