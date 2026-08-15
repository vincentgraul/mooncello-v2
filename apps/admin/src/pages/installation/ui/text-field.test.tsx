import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

describe('TextField', () => {
  it('associe le libellé au champ', () => {
    render(<TextField label="Adresse email" name="email" />)

    const field = screen.getByLabelText('Adresse email')
    const label = screen.getByText('Adresse email')

    expect(field).toHaveAttribute('id')
    expect(field.getAttribute('id')).not.toBe('')
    expect(label).toHaveAttribute('for', field.getAttribute('id'))
  })

  it("marque le champ invalide quand une erreur est affichée", () => {
    render(<TextField label="Mot de passe" name="password" error="Trop court" />)

    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Trop court')
  })

  it("ne marque pas le champ invalide en l'absence d'erreur", () => {
    render(<TextField label="Nom" name="name" hint="Votre nom complet" />)

    expect(screen.getByLabelText('Nom')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Votre nom complet')).toBeInTheDocument()
  })
})
