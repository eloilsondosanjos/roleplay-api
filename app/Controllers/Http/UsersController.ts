import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import User from 'App/Models/User'
import CreateUser from 'App/Validators/CreateUserValidator'
import UpdateUser from 'App/Validators/UpdateUserValidator'

export default class UsersController {
  public async store({ request, response }: HttpContextContract) {
    const userPayload = await request.validate(CreateUser)

    const userEmailExists = await User.findBy('email', userPayload.email)
    const userNameExists = await User.findBy('username', userPayload.username)

    if (userEmailExists) {
      throw new BadRequest('email already in use', 409)
    }

    if (userNameExists) {
      throw new BadRequest('username already in use', 409)
    }

    const user = await User.create(userPayload)

    return response.created({ user })
  }

  public async update({ request, response }: HttpContextContract) {
    const { email, password, avatar } = await request.validate(UpdateUser)
    const id = request.param('id')

    const user = await User.findOrFail(id)

    user.email = email
    user.password = password
    if (avatar) user.avatar = avatar

    await user.save()

    return response.ok({ user })
  }
}
