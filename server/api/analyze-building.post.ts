import OpenAI from 'openai'
import { buildingAnalysisResponseSchema } from '../../types/schemas/building-analysis.schema'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Get the OpenAI API key from environment variables
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key not configured'
    })
  }

  const client = new OpenAI({
    apiKey: apiKey
  })

  // Get the request body (should contain images and address)
  const body = await readBody(event)
  const { address = 'TBD', images = [] } = body

  console.log('Received address:', address)

  if (!images || images.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No images provided'
    })
  }

  // Build the reference schema text
  const schemaText = `All of these images describe the building located at: ${address}

The first image is the top-down view, the next images are of the street view. Based on these images, tell me the # floors, window-to-wall ratio, architectural style, estimated building age, % mix of facade materials, and % mix of program.

IMPORTANT: You MUST use "${address}" as the address field in your response. Do not try to determine the address from the images.

Output each one of these categories into a combined matrix JSON based on the attached reference:

{
  "version": "1.1",
  "description": "Reference format for building analysis outputs from images.",
  "schema": {
    "combined_matrix": {
      "address": "string. Use the exact address provided above: ${address}",
      "num_floors": "integer. Total number of above-grade floors estimated from the images.",
      "window_to_wall_ratio": "number between 0 and 1. Estimated ratio of glazed area to total facade area.",
      "architectural_style": "string. Must be one of: 'prewar_masonry', 'art_deco', 'modernist', 'brutalist', 'postmodern', 'postwar_commercial', 'contemporary_glass', 'industrial_loft', 'townhouse_rowhouse', 'vernacular_other', 'unknown'. Choose the closest fit.",
      "architectural_style_add": "string. Short free-text explanation of key stylistic qualities",
      "estimated_building_age": "string. Either a single year like '1975' or a range like '1960-1980'.",
      "facade_material_mix": [
        {
          "material": "string. Must be one of: 'glass', 'brick', 'stone', 'concrete', 'metal_panel', 'composite_panel', 'stucco', 'wood', 'terracotta', 'other'.",
          "percent": "number between 0 and 100. Estimated percentage of total visible facade area. All items together should sum to ~100."
        }
      ],
      "program_mix": [
        {
          "program": "string. Must be one of: 'residential', 'office', 'retail', 'hotel', 'industrial', 'parking', 'institutional', 'civic', 'community', 'mechanical_other', 'unknown'.",
          "percent": "number between 0 and 100. Estimated percentage of total building area for this program. All items together should sum to ~100."
        }
      ],
      "confidence_scores": {
        "num_floors": "number between 0 and 1. Model confidence in num_floors estimate.",
        "window_to_wall_ratio": "number between 0 and 1.",
        "architectural_style": "number between 0 and 1.",
        "estimated_building_age": "number between 0 and 1.",
        "facade_material_mix": "number between 0 and 1.",
        "program_mix": "number between 0 and 1."
      },
      "notes": "string. Short free-text explanation of key assumptions, uncertainties, and anything unusual about the building."
    }
  },
  "example_output": {
    "combined_matrix": {
      "address": "123 Example Street, New York, NY 10001, USA",
      "num_floors": 12,
      "window_to_wall_ratio": 0.65,
      "architectural_style": "contemporary_glass",
      "estimated_building_age": "2000-2010",
      "facade_material_mix": [
        {
          "material": "glass",
          "percent": 70
        },
        {
          "material": "metal_panel",
          "percent": 20
        },
        {
          "material": "stone",
          "percent": 10
        }
      ],
      "program_mix": [
        {
          "program": "office",
          "percent": 85
        },
        {
          "program": "retail",
          "percent": 10
        },
        {
          "program": "mechanical_other",
          "percent": 5
        }
      ],
      "confidence_scores": {
        "num_floors": 0.95,
        "window_to_wall_ratio": 0.8,
        "architectural_style": 0.7,
        "estimated_building_age": 0.6,
        "facade_material_mix": 0.75,
        "program_mix": 0.7
      },
      "notes": "Ground floor appears to be retail with double-height storefront glazing. Upper floors show typical office floorplates with curtain wall. Building age is estimated based on facade detailing and glazing type; exact year may differ."
    }
  }
}
`

  // Build the content array with images
  const contentArray: Array<OpenAI.Chat.ChatCompletionContentPartText | OpenAI.Chat.ChatCompletionContentPartImage> = [
    {
      type: 'text',
      text: schemaText
    }
  ]

  // Add images to content array
  for (const image of images) {
    contentArray.push({
      type: 'image_url',
      image_url: {
        url: image.url || image,
        detail: image.detail || 'auto'
      }
    })
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o as gpt-5 is not available yet
      messages: [
        {
          role: 'user',
          content: contentArray
        }
      ],
      response_format: { type: 'json_object' },
      store: true
    })

    // Parse the raw JSON response
    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No content received from OpenAI'
      })
    }

    let parsedData
    try {
      parsedData = JSON.parse(rawContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid JSON response from OpenAI'
      })
    }

    // Validate the response structure with Zod
    const validationResult = buildingAnalysisResponseSchema.safeParse(parsedData)

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.format())
      console.error('Raw response:', JSON.stringify(parsedData, null, 2))

      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid response structure from OpenAI',
        data: {
          validationErrors: validationResult.error.format(),
          rawResponse: parsedData
        }
      })
    }

    // Normalize the response structure
    // If the response is wrapped in { schema: { combined_matrix: {...} } }, extract it
    const normalizedData = 'schema' in validationResult.data
      ? { combined_matrix: validationResult.data.schema.combined_matrix }
      : validationResult.data

    return {
      success: true,
      data: normalizedData,
      usage: response.usage
    }
  } catch (error) {
    // If it's already a createError, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('OpenAI API Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to analyze building images',
      data: error
    })
  }
})
