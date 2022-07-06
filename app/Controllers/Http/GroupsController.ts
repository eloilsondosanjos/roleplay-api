import BadRequest from 'App/Exceptions/BadRequestException'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Group from 'App/Models/Group'
import CreateGroup from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const { term, ['user']: userId } = request.qs()

    let groups = [] as any
    if (!userId) {
      groups = await Group.query().preload('players').preload('masterUser')
    } else {
      if (!term) {
        groups = await Group.query()
          .preload('players')
          .preload('masterUser')
          .whereHas('players', (query) => {
            query.where('id', userId)
          })
      } else {
        groups = await Group.query()
          .preload('players')
          .preload('masterUser')
          .whereHas('players', (query) => {
            query.where('id', userId)
          })
          .where('name', 'LIKE', `%${term}%`)
          .orWhere('description', 'LIKE', `%${term}%`)
      }
    }

    return response.ok({ groups })
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup)
    const group = await Group.create(groupPayload)

    await group.related('players').attach([groupPayload.master])
    await group.load('players')

    return response.created({ group })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const payload = request.all()
    const group = await Group.findOrFail(id)

    await bouncer.authorize('updateGroup', group)

    const updatedGroup = await group.merge(payload).save()

    return response.ok({ group: updatedGroup })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = Number(request.param('groupId'))
    const playerId = Number(request.param('playerId'))

    const group = await Group.findOrFail(groupId)

    if (playerId === group.master) {
      throw new BadRequest('cannot remove master from group', 400)
    }

    await group.related('players').detach([playerId])

    return response.ok({})
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const groupId = request.param('id')

    const group = await Group.findOrFail(groupId)

    await bouncer.authorize('deleteGroup', group)

    await group.delete()
    await group.related('players').detach()

    return response.ok({})
  }
}
