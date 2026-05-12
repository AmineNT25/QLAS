export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  options: string[] // only used for 'select'
}
