import User from 'App/Models/User'
import Mail from '@ioc:Adonis/Addons/Mail'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { v4 as uuidv4 } from 'uuid'
import ForgotPassword from 'App/Validators/ForgotPasswordValidator'
import ResetPassword from 'App/Validators/ResetPasswordValidator'
import TokenExpired from 'App/Exceptions/TokenExpiredException'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email, resetPasswordUrl } = await request.validate(ForgotPassword)

    const user = await User.findByOrFail('email', email)
    const token = uuidv4()
    await user.related('tokens').updateOrCreate(
      {
        userId: user.id,
      },
      {
        token,
      }
    )

    const resetPasswordUrlWithToken = `${resetPasswordUrl}?token=${token}`

    await Mail.send((message) => {
      message
        .from('no-reply@roleplay.com')
        .to(email)
        .subject('Roleplay: Recuperação de senha')
        .htmlView('email/forgotpassword', {
          productName: 'Roleplay',
          name: user.username,
          resetPasswordUrl: resetPasswordUrlWithToken,
        })
    })

    return response.noContent()
  }

  public async resetPassword({ request, response }: HttpContextContract) {
    const { token, password } = await request.validate(ResetPassword)

    const userByToken = await User.query()
      .whereHas('tokens', (query) => {
        query.where('token', token)
      })
      .preload('tokens')
      .firstOrFail()

    const tokenAge = Math.abs(userByToken.tokens[0].createdAt.diffNow('hours').hours)
    if (tokenAge > 2) {
      throw new TokenExpired()
    }

    userByToken.password = password

    await userByToken.save()
    await userByToken.tokens[0].delete()

    return response.noContent()
  }
}
