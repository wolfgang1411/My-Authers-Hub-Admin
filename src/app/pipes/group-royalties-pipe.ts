import { Pipe, PipeTransform } from '@angular/core';
import { PlatForm, RoyaltyFormGroup } from '../interfaces';
import { FormControl, FormGroup } from '@angular/forms';

@Pipe({
  name: 'groupRoyalties',
})
export class GroupRoyaltiesPipe implements PipeTransform {
  transform(value: FormGroup<RoyaltyFormGroup>[]): {
    group: FormGroup<RoyaltyFormGroup>;
    controls: Partial<Record<PlatForm, FormControl>>;
  }[] {
    let temp: {
      group: FormGroup<RoyaltyFormGroup>;
      controls: Partial<Record<PlatForm, FormControl>>;
    }[] = [];

    value.forEach((group) => {
      const { authorId, publisherId, platform, percentage } = group.controls;

      const existing = temp.find(
        ({ group: { controls } }) =>
          (controls.authorId.value &&
            controls.authorId.value === authorId.value) ||
          (controls.publisherId.value &&
            controls.publisherId.value === publisherId.value)
      );

      const platformKey = platform.value as PlatForm;

      if (existing) {
        existing.controls[platformKey] = percentage;
      } else {
        temp.push({
          group,
          controls: { [platformKey]: percentage },
        });
      }
    });

    return temp;
  }
}
